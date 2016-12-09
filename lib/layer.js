"use strict";

// A collection of meshes which share a common shader program.
// This is an abstract base class: it can't draw anything by
// itself, but merely contains common code for use by specific
// Layer types. For 2D you probably want to base your layers on
// `Indexed2DLayer` (farther down in this file) which manages 2D
// vertices and has methods for creating various shapes.

function Layer() {
	this.meshes = [];     // Things that we know how to draw.
	this.instances = [];  // Mesh instances to draw this frame.

	// Have we added (or, theoretically, removed) meshes?
	// If so, we need to send the new vertex data to the GPU.
	this.dirty = true;
}

Layer.prototype.clear = function() {
	this.meshes = [];
	this.instances = [];
	this.dirty = true;
}


// -----------------------------------------------------------------------
// A mesh is a contiguous sequence of vertices within a layer.

function Mesh(layer, firstVertex, firstIndex) {
	this.firstVertex = +firstVertex;
	this.vertexCount = layer.positions.length - this.firstVertex;

	if(typeof layer.indices !== 'undefined') {
		this.firstIndex = +firstIndex;
		this.indexCount = layer.indices.length - this.firstIndex;
	}

	layer.meshes.push(this);
	layer.dirty = true;
}


// -----------------------------------------------------------------------
// A mesh instance tells where to draw a copy of a mesh. Specific
// layer types will extend this to include the other variables needed
// by their particular shader programs.

function MeshInstance(layer, mesh) {
	this.layer = layer;
	this.mesh = mesh;
	this.pos = [0, 0];
	this.xDir = [1, 0];
}

MeshInstance.prototype.draw = function(pos, xDir) {
	if(pos) this.pos = pos;
	if(xDir) this.xDir = xDir;
	this.layer.instances.push(this);
}

MeshInstance.prototype.vertexData = function() {
}

MeshInstance.prototype.properties = function() {
	return {
		model: [
			this.xDir[0], this.xDir[1],   // x vector
			-this.xDir[1], this.xDir[0],  // y vector
			this.pos[0],   this.pos[1],   // origin
		]
	}
}


// -----------------------------------------------------------------------
// Axis-Aligned Bounding Box

// Takes one or more 2D points as arguments.
function AABB2D() {
	this.l = arguments[0][0]; this.t = arguments[0][1];
	this.r = this.l;  this.b = this.t;
	for(var i=1; i<arguments.length; ++i) this.add(arguments[i]);
}

// Extend the box to encompass the given point.
AABB2D.prototype.add = function(p) {
	this.l = Math.min(this.l, p[0]);  this.r = Math.max(this.r, p[0]);
	this.b = Math.min(this.b, p[1]);  this.t = Math.max(this.t, p[1]);
}


// -----------------------------------------------------------------------
// Helper class for 2D layers with indexed vertices.

function Indexed2DLayer() {
	Layer.call(this);

	this.positions = [];
	this.indices = [];
}

Indexed2DLayer.prototype = Object.create(Layer.prototype);

Indexed2DLayer.prototype.clear = function() {
	Layer.prototype.clear.call(this);
	this.positions = [];
	this.indices = [];
}

// Compute the number of sides needed to have a polygonal "circle"
// that doesn't deviate from a true circle by more than `rErr`.
function circleSides(r, rErr) {
	if(r && rErr) return Math.round(Math.PI / Math.acos(1 - rErr/r));
	else return 20;
}

// center, halfX, and halfY are 2D vectors.
Indexed2DLayer.prototype.parallelogram = function(halfX, halfY) {
	var i0 = this.indices.length;
	var v0 = this.positions.length;
	var topLeft = V2.inc(V2.dec([0, 0], halfX), halfY);
	var topRight = V2.inc(V2.inc([0, 0], halfX), halfY);
	var bottomLeft = V2.dec(V2.dec([0, 0], halfX), halfY);
	var bottomRight = V2.dec(V2.inc([0, 0], halfX), halfY);
	this.positions.push(topLeft, topRight, bottomLeft, bottomRight);
	this.indices.push(v0, v0+1, v0+2,  v0+2, v0+1, v0+3);
	var m = new Mesh(this, v0, i0);
	m.bounds = new AABB2D(topLeft, topRight, bottomLeft, bottomRight);
	return m;
}

Indexed2DLayer.prototype.rectangle = function(w, h) {
	return this.parallelogram([w, 0], [0, h]);
}

Indexed2DLayer.prototype.triangle = function(a, b, c) {
	var i0 = this.indices.length;
	var v0 = this.positions.length;
	this.positions.push(a, b, c);
	this.indices.push(v0, v0+1, v0+2);
	var m = new Mesh(this, v0, i0);
	m.bounds = new AABB2D(a, b, c);
	return m;
};

Indexed2DLayer.prototype.circle = function(r, rErr) {
	var sides = circleSides(r, rErr);
	var i0 = this.indices.length;
	var v0 = this.positions.length, v1 = v0+1;
	this.positions.push([0,0]);
	for(var i=0; i<sides; ++i) {
		var angle = i * 2*Math.PI / sides;
		this.positions.push([r*Math.cos(angle), r*Math.sin(angle)]);
		this.indices.push(v0, v1+i, v1+i+1);
	}
	this.indices[this.indices.length-1] = v1;

	var m = new Mesh(this, v0, i0);
	m.bounds = new AABB2D([-r, r], [r, -r]);
	return m;
}

Indexed2DLayer.prototype.arc = function(r, dr, th, dth, rErr) {
	var bounds = new AABB2D([0, 0]);
	var sides = Math.round(circleSides(r, rErr) * dth / 2*Math.PI);
	var inside = r - (dr/2), outside = r + (dr/2);
	var i0 = this.indices.length;
	var v0 = this.positions.length;
	for(var i=0; i<=sides; ++i) {
		var angle = th + dth * i/sides;
		var x = Math.cos(angle);
		var y = Math.sin(angle);
		var pIn = [inside*x, inside*y], pOut = [outside*x, outside*y];
		this.positions.push(pIn);  this.positions.push(pOut);
		bounds.add(pIn);  bounds.add(pOut);
		var v = v0 + 2*i;
		this.indices.push(v, v+1, v+2);
		this.indices.push(v+2, v+1, v+3);
	}
	this.indices.splice(-6);

	var m = new Mesh(this, v0, i0);
	m.bounds = bounds;
	return m;
}
