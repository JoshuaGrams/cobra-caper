// A collection of textured meshes.

function TexturedLayer(glCtx, img) {
	Indexed2DLayer.call(this);

	this.img = WebGL.Texture(glCtx, img, glCtx.RGBA);

	this.uvs = [];

	this.pBuf = new Float32Array(2*2000);   // positions
	this.uvBuf = new Float32Array(2*2000);  // colors
	this.iBuf = new Uint16Array(3000);      // indices
	this.pBufUsed = 0;
	this.iBufUsed = 0;

	vertex = 'attribute vec2 p;\n'
		+ 'attribute vec2 uv;\n'
		+ 'varying vec2 texCoord;\n'
		+ 'uniform mat3 view;\n'
		+ 'void main(void) {\n'
		+ '\ttexCoord = uv;\n'
		+ '\tvec3 q = vec3(p, 1) * view;\n'
		+ '\tgl_Position = vec4(q.xy, 0, 1);\n'
		+ '}\n';

	fragment = 'precision mediump float;\n'
		+ 'varying vec2 texCoord;\n'
		+ 'uniform sampler2D img;\n'
		+ 'void main(void) { gl_FragColor = texture2D(img, texCoord); }\n';

	this.shader = new WebGL.ShaderFrom(glCtx, vertex, fragment, glCtx.TRIANGLES,
			['mat3 view'], ['vec2 p', 'vec2 uv', 'indices']);
}

TexturedLayer.prototype = Object.create(Indexed2DLayer.prototype);

TexturedLayer.prototype.draw = function(view) {
	this.shader.set({view: view, img: [this.img, 0]});
	for(var i=0; i<this.instances.length; ++i) {
		this.accumulateMeshData(this.instances[i]);
	}
	this.flush();
	this.instances.length = 0;
};

TexturedLayer.prototype.flush = function() {
	var p = this.pBuf.subarray(0, 2*this.pBufUsed);
	var uv = this.uvBuf.subarray(0, 2*this.pBufUsed);
	var i = this.iBuf.subarray(0, this.iBufUsed);
	this.shader.draw({}, [p, uv, i], 0, this.iBufUsed);
	this.pBufUsed = 0;  this.iBufUsed = 0;
};

TexturedLayer.prototype.accumulateMeshData = function(instance) {
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
	var model = props.model;
	for(var i=0; i<mesh.vertexCount; ++i) {
		V2.copy(p, this.positions[i + mesh.firstVertex]);
		V2.transform(p, model);
		var uv = this.uvs[i + mesh.firstVertex];
		var ip = 2*this.pBufUsed, iuv = 2*this.pBufUsed;
		this.pBuf[ip+0] = p[0];
		this.pBuf[ip+1] = p[1];
		this.uvBuf[iuv+0] = uv[0];
		this.uvBuf[iuv+1] = uv[1];
		this.pBufUsed++;
	}
};

TexturedLayer.prototype.addUVs = function(mesh, pixRect) {
	var x = Math.min(mesh.bounds.l, mesh.bounds.r);
	var y = Math.min(mesh.bounds.t, mesh.bounds.b);
	var w = Math.abs(mesh.bounds.r - mesh.bounds.l);
	var h = Math.abs(mesh.bounds.b - mesh.bounds.t);
	var px = pixRect.x / pixRect.img.width;
	var py = pixRect.y / pixRect.img.height;
	var pw = pixRect.w / pixRect.img.width;
	var ph = pixRect.h / pixRect.img.height;
	var xScale = pw / w, yScale = ph / h;
	for(var i=0; i<mesh.vertexCount; ++i) {
		var p = this.positions[i + mesh.firstVertex];
		var u = px + (p[0] - x) * xScale;
		var v = py + (p[1] - y) * yScale;
		this.uvs.push([u, v]);
	}
};

TexturedLayer.prototype.parallelogram = function(halfX, halfY, pixRect) {
	var m = Indexed2DLayer.prototype.parallelogram.call(this, halfX, halfY);
	this.addUVs(m, pixRect);
	return m;
};

TexturedLayer.prototype.rectangle = function(w, h, pixRect) {
	return this.parallelogram([w, 0], [0, h], pixRect);
};

TexturedLayer.prototype.triangle = function(a, b, c, pixRect) {
	var m = Indexed2DLayer.prototype.triangle.call(this, a, b, c);
	this.addUVs(m, pixRect);
	return m;
};

TexturedLayer.prototype.circle = function(r, pixRect, rErr) {
	var m = Indexed2DLayer.prototype.circle.call(this, r, rErr);
	this.addUVs(m, pixRect);
	return m;
};

TexturedLayer.prototype.arc = function(r, dr, th, dth, pixRect, rErr) {
	var m = Indexed2DLayer.prototype.arc.call(this, r, dr, th, dth);
	this.addUVs(m, pixRect);
	return m;
};

TexturedLayer.prototype.font = function() { return new PixelFont(this); }

function PixelFont(layer) {
	this.layer = layer;
	this.characters = [];
}

PixelFont.prototype.addCharacters = function(cp0, cp1, cols, rows, pixRect) {
	// Texture space rectangle. Increments with each character.
	var uvRect = {
		x: pixRect.x, y: pixRect.y,
		w: pixRect.w / cols, h: pixRect.h / rows,
		img: pixRect.img
	};
	// Model-space vertices: same for all characters
	// (all same size and placed by their top-left corner).
	var vertices = [
		[0, 0],
		[uvRect.w, 0],
		[0, uvRect.h],
		[uvRect.w, uvRect.h]
	];
	for(var i=cp0; i<cp1; ++i) {  // "Code Points"
		var i0 = this.layer.indices.length;
		var v0 = this.layer.positions.length;
		this.layer.positions.push.apply(this.layer.positions, vertices);
		this.layer.indices.push(v0, v0+1, v0+2, v0+2, v0+1, v0+3);
		var m = new Mesh(this.layer, v0, i0);
		m.bounds = new AABB2D(vertices[0], vertices[3]);
		this.layer.addUVs(m, uvRect);
		this.characters[i] = m;

		// Move uvRect to the right (wraping to next line as needed).
		uvRect.x += uvRect.w;
		if(uvRect.x - pixRect.x >= pixRect.w) {
			uvRect.x = pixRect.x;
			uvRect.y += uvRect.h;
		}
	}

	return this; // for method chaining
}

// Can draw the same text in the same place by calling `.draw()` on each
// MeshInstance in the returned array.
PixelFont.prototype.drawText = function(pos, xDir, text) {
	var chars = [];
	pos = pos.slice();
	for(var i=0; i<text.length; ++i) {
		var c = text.charCodeAt(i);
		var m = new MeshInstance(this.layer, this.characters[c]);
		chars.push(m);
		m.draw(pos.slice(), xDir);
		pos[0] += m.mesh.bounds.r - m.mesh.bounds.l;
	}
	return chars;
}
