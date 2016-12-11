function Player(layer, headMesh, bodyMesh, radius, maxSpeed, linearDamping) {
	RigidBody.call(this, layer, headMesh, radius, maxSpeed, linearDamping);
	this.accel = 17;
	this.history = [this.transform.position.slice()];
	this.history.threshold = radius;
	this.history.limit = 100;
	this.segments = [];
	this.segments.spacing = 3.8*radius;
	this.segments.headSpacing = 4.4*radius;
	for(var i=0; i<10; ++i) {
		this.segments[i] = new MeshInstance(layer, bodyMesh);
		this.segments[i].visible = true;
	}
}
Player.prototype = Object.create(RigidBody.prototype);

Player.tmp = [];

Player.prototype.draw = function() {

	// Place and draw body segments
	var space = this.segments.headSpacing;
	var hist = this.history, h = hist.length;
	var next = this.transform.position;
	var cur, last = this.transform.position;
	var offset = Player.tmp, dist = 0;
	segLoop: for(i=0; i<this.segments.length; ++i) {
		if(!this.segments[i].visible) break;
		while(space > dist) {
			if(!h) break segLoop;
			space -= dist;
			cur = last;  last = hist[--h];
			offset = V2.sub(offset, cur, last);
			dist = V2.length(offset);
		}
		V2.lerp(this.segments[i].transform.position, space/dist, cur, last);
		this.segments[i].transform.rotation = V2.angle(offset);
		dist -= space; space = this.segments.spacing;
		next = this.segments[i].transform.position;
	}

	for(var i=this.segments.length-1; i>=0; --i) {
		this.segments[i].draw();
	}
	RigidBody.prototype.draw.call(this);
}

Player.prototype.step = function(ds, walls) {
	RigidBody.prototype.step.call(this, ds, walls);
	var hist = this.history;
	var lastPos = hist[hist.length-1];
	var curPos = this.transform.position;
	var offset = V2.sub(Player.tmp, curPos, lastPos);
	var dist = V2.length(offset);
	if(dist > hist.threshold) {
		hist.push(curPos.slice());
		while(hist.length > hist.limit) hist.shift();
	}
	if(dist > 0.0001 * this.radius) {
		this.transform.rotation = V2.angle(offset);
	}
}

