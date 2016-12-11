function RigidBody(layer, mesh, radius, maxSpeed, linearDamping) {
	MeshInstance.call(this, layer, mesh);
	this.radius = radius;
	this.maxSpeed = maxSpeed;
	this.linearDamping = linearDamping;
	this.motion = new Transform2D();
	this.a = [0, 0];  // acceleration
}
RigidBody.prototype = Object.create(MeshInstance.prototype);

RigidBody.prototype.step = function(ds, walls) {
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

	this.bounce(walls);

	t.move(V2.x([], v.position, ds));
}

RigidBody.prototype.bounce = function(walls) {
	var p = this.transform.position;
	var v = this.motion.position;
	for(var i=0; i<walls.length; ++i) {
		var w = walls[i];
		if(pointToSegmentDistance(p, w.start, w.end) < this.radius) {
			bounceFromSegment(v, w.start, w.end);
		}
	}
}
