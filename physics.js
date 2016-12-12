function Physics() {
	this.rigidBodies = [];
	this.staticBodies = [];
	this.pendingDeletion = {};
	this.nextID = 0;
	this.freeIDs = [];
}
Physics.tmp = [];  Physics.tmp2 = [];  // temporary vectors

Physics.prototype.addBody = function(b) {
	b._bodyID = this.nextFreeID();
	b._bodyIndex = this.rigidBodies.length;
	if(b instanceof RigidBody) {
		this.rigidBodies.push(b);
	} else if(b instanceof StaticBody) {
		this.staticBodies.push(b);
	}
}

Physics.prototype.nextFreeID = function() {
	if(this.freeIDs.length) return this.freeIDs.pop();
	else return this.nextID++;
}

Physics.prototype.removeBody = function(b) {
	this.pendingDeletion[b._bodyID] = b;
}

Physics.prototype.processDeletions = function() {
	var bodies = this.pendingDeletion;
	for(id in bodies) if(bodies.hasOwnProperty(id)) {
		var b = bodies[id];
		if(b instanceof RigidBody) {
			this.rigidBodies.splice(b._bodyIndex, 1);
		} else if(b instanceof StaticBody) {
			this.staticBodies.splice(b._bodyIndex, 1);
		}
		this.freeIDs.push(b._bodyID);
		delete b._bodyIndex;
		delete b._bodyID;
	}
}

Physics.prototype.draw = function() {
	for(var i=0; i<this.staticBodies.length; ++i) {
		this.staticBodies[i].draw();
	}

	for(var i=0; i<this.rigidBodies.length; ++i) {
		this.rigidBodies[i].draw();
	}
}

Physics.prototype.step = function(dt) {
	for(var i=0; i<this.rigidBodies.length; ++i) {
		if(this.pendingDeletion[this.rigidBodies[i]._bodyID]) continue;
		this.rigidBodies[i].step(dt);
	}
	this.handleCollisions(dt);
	this.processDeletions();
}

Physics.prototype.handleCollisions = function(dt) {
	var collisions = this.getCollisions(dt);
	for(var i=0; i<collisions.length; ++i) {
		var c = collisions[i];
		if(c.type === 'rigid/rigid') this.bounceRigidBodies(c.a, c.b);
		if(c.type === 'rigid/static') {
			this.bounceRigidFromStaticBody(c.a, c.b);
		}
		if(c.a.collideWith) c.a.collideWith(c.b);
		if(c.b.collideWith) c.b.collideWith(c.a);
	}
}

Physics.prototype.getCollisions = function(dt) {
	var collisions = [];
	var n = this.rigidBodies.length;
	var m = this.staticBodies.length;

	for(var i=0; i<n; ++i) {
		var a = this.rigidBodies[i];
		if(a.noCollide) continue;

		// Check against rest of rigid bodies (circles).
		for(var j=i+1; j<n; ++j) {
			var b = this.rigidBodies[j];
			if(b.noCollide) continue;
			t = this.rigidBodiesCollide(a, b, dt);
			if(t !== false && t >= 0 && t < dt) {
				collisions.push({a: a, b: b, t: t, type: 'rigid/rigid'});
			}
		}

		// Check against static bodies (line segments).
		for(var j=0; j<m; ++j) {
			var b = this.staticBodies[j];
			t = this.rigidAndStaticBodiesCollide(a, b, dt);
			if(t !== false && t >= 0 && t < dt) {
				collisions.push({a: a, b: b, t: t, type: 'rigid/static'});
			}
		}
	}

	return collisions.sort(Physics.compareCollisionTime);
}
Physics.compareCollisionTime = function(a, b) { return a.t - b.t }

Physics.prototype.rigidBodiesCollide = function(p, q) {
	var dp = V.sub(Physics.tmp1, q.transform.position, p.transform.position);
	var dv = V.sub(Physics.tmp2, q.motion.position, p.motion.position);
	var r = r0 + r1;

	// Find the time when |dp + t*dv| = r, i.e. square both sides
	// and solve the resulting quadratic:
	// t^2*|dv|^2 + 2*t*dot(dv,dp) + |dp|^2 - r^2 = 0.
	var a = V.dot(dv, dv);
	var b = 2*V.dot(dv, dp);
	var c = V.dot(dp, dp) - r*r;
	if(c < 0) return 0;  // They are already overlapping.
	var t = solveQuadratic(a, b, c);
	if(t) {
		if(t[0] >= 0 && t[0] < t[1]) return t[0];
		else if(t[1] >= 0) return t[1];
	}
	return false;
}


Physics.prototype.rigidAndStaticBodiesCollide = function(a, b, dt) {
	var p = a.transform.position;
	if(pointToSegmentDistance(p, b.start, b.end) < a.radius) {
		return 0.99 * dt;  // attempt to do these last
	} else return false;
}

// circle/circle
Physics.prototype.bounceRigidBodies = function(a, b) {
	var e = Math.max(a.elasticity, b.elasticity);      // XXX - or average?
	var m = a.m + b.m;
	var n = V.sub(Physics.tmp, b.transform.position, a.transform.position);
	var dist = V.length(n);
	V.scale(n, 1/dist);
	var ua = V.dot(n, a.motion.position);  // normal speeds
	var ub = V.dot(n, b.motion.position);
	var du = ub - ua;

	// Move them so they don't overlap.
	var o = Physics.tmp2;
	var overlap = (a.radius + b.radius) - dist;
	if (overlap > 0) {
		// 1% extra, as 1 minus proportion of total mass, i.e use *other* mass.
		overlap *= 1.01 / m;
		V.dec(a.transform.position, V.x(o, n, overlap * b.m));
		V.inc(b.transform.position, V.x(o, n, overlap * a.m));
	}

	if(du < 0) {  // are they moving toward each other?
		var mv = a.m*ua + b.m*ub;
		var va = (mv + e*du*b.m) / m;
		var vb = (mv - e*du*a.m) / m;
		V.dec(a.motion.position, V.x(o, n, ua - va));
		V.dec(b.motion.position, V.x(o, n, ub - vb));
		return true;
	} else return false;
}

// circle/line
Physics.prototype.bounceRigidFromStaticBody = function(a, b) {
	var v = a.motion.position, c = a.transform.position, r = a.radius;
	var p = b.start, q = b.end;

	var n = V2.normalize(V2.perp2d(V2.sub(Physics.tmp, q, p)));
	var n2 = V2.length_squared(n);

	var normalSpeed = V2.dot(n, v);
	var overlap = r - V2.dot(n, V2.sub(Physics.tmp2, c, p));

	if(normalSpeed < 0) V2.sub(v, v, V2.x(Physics.tmp2, n, 2*normalSpeed));
	if(overlap > 0) V2.add(c, c, V2.x(Physics.tmp2, n, 1.01*overlap));
}



// -----------------------------------------------------------------------

function RigidBody(layer, mesh, radius, maxSpeed, linearDamping) {
	MeshInstance.call(this, layer, mesh);
	this.radius = radius;
	this.maxSpeed = maxSpeed;
	this.linearDamping = linearDamping;
	this.motion = new Transform2D();
	this.a = [0, 0];  // acceleration
	this.elasticity = 0.7;
	this.m = 1;
}
RigidBody.prototype = Object.create(MeshInstance.prototype);

RigidBody.prototype.step = function(ds) {
	var t = this.transform;
	var v = this.motion;

	// Add acceleration and cap velocity.
	V2.add(v.position, v.position, V2.x(this.a, this.a, ds));
	var speed = V2.length(v.position);
	if(speed > this.maxSpeed) {
		V2.x(v.position, v.position, this.maxSpeed / speed);
		speed = this.maxSpeed;
	}

	// Damp velocity and zero it if we're going very slow.
	if(speed < 0.001) { v.position[0] = 0;  v.position[1] = 0; }
	else V2.x(v.position, v.position, 1 - this.linearDamping);

	t.move(V2.x([], v.position, ds));
}



// -----------------------------------------------------------------------

function StaticBody(start, end, sprite) {
	this.start = start;
	this.end = end;
	this.sprite = sprite;
}

StaticBody.prototype.draw = function() {
	if(this.sprite) this.sprite.draw();
}
