"use strict";

// A collection of meshes which share a common shader program.
// This is an abstract base class: it can't draw anything by
// itself, but merely contains common code for use by specific
// Layer types. For 2D you probably want to base your layers on
// `Indexed2DLayer` (farther down in this file) which manages 2D
// vertices and has methods for creating various shapes.

function Layer() {
	this.instances = [];  // Mesh instances to draw this frame.
}

Layer.prototype.clear = function() {
	this.instances.length = 0;
}


// -----------------------------------------------------------------------
// A mesh is a set of vertices that are assembled into triangles.

function Mesh(vertices, indices) {
	this.positions = vertices || [];
	if(typeof indices !== 'undefined') this.indices = indices || [];
	this.bounds = new AABB2D();
}


// -----------------------------------------------------------------------
// A mesh instance tells where to draw a copy of a mesh. Specific
// layer types will extend this to include the other variables needed
// by their particular shader programs.

function MeshInstance(layer, mesh, position, rotation, scale) {
	this.layer = layer;
	this.mesh = mesh;
	this.transform = new Transform2D(position, rotation, scale);
}

MeshInstance.prototype.draw = function(position, rotation, scale) {
	this.transform.set(position, rotation, scale);
	this.layer.instances.push(this);
}

MeshInstance.prototype.properties = function() {
	return { model: this.transform.matrix() }
}


// -----------------------------------------------------------------------
// Axis-Aligned Bounding Box

// Takes one or more 2D points as arguments.
function AABB2D() {
	this.l = Infinity; this.r = -Infinity;
	this.t = -Infinity; this.b = Infinity;
}

// Extend the box to encompass the given point.
AABB2D.prototype.add = function() {
	for(var i=0; i<arguments.length; ++i) {
		var p = arguments[i];
		this.l = Math.min(this.l, p[0]);
		this.r = Math.max(this.r, p[0]);
		this.b = Math.min(this.b, p[1]);
		this.t = Math.max(this.t, p[1]);
	}
	return this;
}


// -----------------------------------------------------------------------
// Helper functions for 2D indexed shapes.

// Compute the number of sides needed to have a polygonal "circle"
// that doesn't deviate from a true circle by more than `rErr`.
function circleSides(r, rErr) {
	if(r && rErr) return Math.round(Math.PI / Math.acos(1 - rErr/r));
	else return 20;
}

// center, halfX, and halfY are 2D vectors.
Mesh.prototype.parallelogram = function(halfX, halfY) {
	var i0 = this.indices.length;
	var v0 = this.positions.length;
	var topLeft = V2.inc(V2.dec([0, 0], halfX), halfY);
	var topRight = V2.inc(V2.inc([0, 0], halfX), halfY);
	var bottomLeft = V2.dec(V2.dec([0, 0], halfX), halfY);
	var bottomRight = V2.dec(V2.inc([0, 0], halfX), halfY);
	this.positions.push(topLeft, topRight, bottomLeft, bottomRight);
	this.indices.push(v0, v0+1, v0+2,  v0+2, v0+1, v0+3);
	this.bounds.add(topLeft, topRight, bottomLeft, bottomRight);
	return this;
}

Mesh.prototype.rectangle = function(w, h) {
	return this.parallelogram([w, 0], [0, h]);
}

Mesh.prototype.quad = function(tl, tr, bl, br) {
	var i0 = this.indices.length;
	var v0 = this.positions.length;
	this.positions.push(tl, tr, bl, br);
	this.indices.push(v0, v0+1, v0+2,  v0+2, v0+1, v0+3);
	this.bounds.add(tl, tr, bl, br);
	return this;
}

Mesh.prototype.triangle = function(a, b, c) {
	var i0 = this.indices.length;
	var v0 = this.positions.length;
	this.positions.push(a, b, c);
	this.indices.push(v0, v0+1, v0+2);
	this.bounds.add(a, b, c);
	return this;
};

Mesh.prototype.circle = function(r, rErr) {
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

	this.bounds.add([-r, r], [r, -r]);
	return this;
}

Mesh.prototype.arc = function(r, dr, th, dth, rErr) {
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
		this.bounds.add(pIn);  bounds.add(pOut);
		var v = v0 + 2*i;
		this.indices.push(v, v+1, v+2);
		this.indices.push(v+2, v+1, v+3);
	}
	this.indices.splice(-6);

	return this;
}
