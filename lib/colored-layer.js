// A collection of solid-colored meshes.

function ColoredLayer(glCtx) {
	Indexed2DLayer.call(this);

	this.pBuf = new Float32Array(2*2000);  // positions
	this.cBuf = new Float32Array(4*2000);  // colors
	this.iBuf = new Uint16Array(3000);     // indices
	this.pBufUsed = 0;
	this.iBufUsed = 0;

	vertex = 'attribute vec2 p;\n'
		+ 'attribute vec4 c;\n'
		+ 'varying vec4 color;\n'
		+ 'uniform mat3 view;\n'
		+ 'void main(void) {\n'
		+ '\tcolor = c;\n'
		+ '\tvec3 q = vec3(p, 1) * view;\n'
		+ '\tgl_Position = vec4(q.xy, 0, 1);\n'
		+ '}\n';

	fragment = 'precision mediump float;\n'
		+ 'varying vec4 color;\n'
		+ 'void main(void) { gl_FragColor = color; }\n';

	this.shader = new WebGL.ShaderFrom(glCtx, vertex, fragment, glCtx.TRIANGLES,
			['mat3 view'], ['vec2 p', 'vec4 c', 'indices']);
}

ColoredLayer.prototype = Object.create(Indexed2DLayer.prototype);

ColoredLayer.prototype.draw = function(view) {
	this.shader.set({view: view});
	for(var i=0; i<this.instances.length; ++i) {
		this.accumulateMeshData(this.instances[i]);
	}
	this.flush();
	this.instances.length = 0;
}

ColoredLayer.prototype.flush = function() {
	var p = this.pBuf.subarray(0, 2*this.pBufUsed);
	var c = this.cBuf.subarray(0, 4*this.pBufUsed);
	var i = this.iBuf.subarray(0, this.iBufUsed);
	this.shader.draw({}, [p, c, i], 0, this.iBufUsed);
	this.pBufUsed = 0;  this.iBufUsed = 0;
}

ColoredLayer.prototype.accumulateMeshData = function(instance) {
	var mesh = instance.mesh;
	var pBufAvail = this.pBuf.length/2 - this.pBufUsed;
	var iBufAvail = this.iBuf.length - this.iBufUsed;
	if(pBufAvail < mesh.vertexCount || iBufAvail < mesh.indexCount) {
		this.flush();
	}
	// XXX - check again and fail if instance is too big for the buffer?


	var di = this.pBufUsed - mesh.firstVertex;
	for(var i=0; i<mesh.indexCount; ++i) {
		var index = this.indices[i + mesh.firstIndex];
		this.iBuf[this.iBufUsed++] = index + di;
	}

	var p = [];
	var props = instance.properties();
	var model = props.model, color = props.color;
	for(var i=0; i<mesh.vertexCount; ++i) {
		V2.copy(p, this.positions[i + mesh.firstVertex]);
		V2.transform(p, model);
		var ip = 2*this.pBufUsed, ic = 4*this.pBufUsed;
		this.pBuf[ip+0] = p[0];
		this.pBuf[ip+1] = p[1];
		this.cBuf[ic+0] = color[0];
		this.cBuf[ic+1] = color[1];
		this.cBuf[ic+2] = color[2];
		this.cBuf[ic+3] = color[3];
		this.pBufUsed++;
	}
}


// -----------------------------------------------------------------------

function ColoredMeshInstance(layer, mesh, color) {
	MeshInstance.call(this, layer, mesh);
	this.color = color.slice();
	if(this.color.length === 3) this.color.push(1);  // opacity
}
ColoredMeshInstance.prototype = Object.create(MeshInstance.prototype);

ColoredMeshInstance.prototype.properties = function() {
	var p = MeshInstance.prototype.properties.call(this);
	p.color = this.color;
	return p;
}
