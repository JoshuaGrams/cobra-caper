// A collection of textured meshes.

function TexturedLayer(glCtx, img) {
	Layer.call(this);

	if(img instanceof Image) this.img = WebGL.Texture(glCtx, img, glCtx.RGBA);
	else this.img = img;

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

TexturedLayer.prototype = Object.create(Layer.prototype);

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
	if(pBufAvail < mesh.positions.length || iBufAvail < mesh.indices.length) {
		this.flush();
	}
	// XXX - check again and fail if instance is too big for the buffer?


	var i0 = this.pBufUsed;
	for(var i=0; i<mesh.indices.length; ++i) {
		this.iBuf[this.iBufUsed++] = mesh.indices[i] + i0;
	}

	var p = [];
	var props = instance.properties();
	var model = props.model;
	for(var i=0; i<mesh.positions.length; ++i) {
		V2.copy(p, mesh.positions[i]);
		V2.transform(p, model);
		var uv = mesh.uvs[i];
		var ip = 2*this.pBufUsed, iuv = 2*this.pBufUsed;
		this.pBuf[ip+0] = p[0];
		this.pBuf[ip+1] = p[1];
		this.uvBuf[iuv+0] = uv[0];
		this.uvBuf[iuv+1] = uv[1];
		this.pBufUsed++;
	}
};

function TexturedMesh(vertices, uvs, indices) {
	Mesh.call(this, vertices, indices || []);
	this.uvs = uvs || [];
}

TexturedMesh.prototype = Object.create(Mesh.prototype);

TexturedMesh.prototype.addUVs = function(pixRect) {
	var x = Math.min(this.bounds.l, this.bounds.r);
	var y = Math.min(this.bounds.t, this.bounds.b);
	var w = Math.abs(this.bounds.r - this.bounds.l);
	var h = Math.abs(this.bounds.b - this.bounds.t);
	var px = pixRect.x / pixRect.img.width;
	var py = pixRect.y / pixRect.img.height;
	var pw = pixRect.w / pixRect.img.width;
	var ph = pixRect.h / pixRect.img.height;
	var xScale = pw / w, yScale = ph / h;
	for(var i=0; i<this.positions.length; ++i) {
		var p = this.positions[i];
		var u = px + (p[0] - x) * xScale;
		var v = py + (p[1] - y) * yScale;
		this.uvs.push([u, v]);
	}
};

TexturedMesh.prototype.parallelogram = function(halfX, halfY, pixRect) {
	Mesh.prototype.parallelogram.call(this, halfX, halfY);
	this.addUVs(pixRect);
	return this;
};

TexturedMesh.prototype.rectangle = function(w, h, pixRect) {
	return this.parallelogram([w, 0], [0, h], pixRect);
};

TexturedMesh.prototype.quad = function(tl, tr, bl, br, pixRect) {
	Mesh.prototype.quad.call(this, tl, tr, bl, br);
	this.addUVs(pixRect);
	return this;
}

TexturedMesh.prototype.triangle = function(a, b, c, pixRect) {
	Mesh.prototype.triangle.call(this, a, b, c);
	this.addUVs(pixRect);
	return this;
};

TexturedMesh.prototype.circle = function(r, pixRect, rErr) {
	Mesh.prototype.circle.call(this, r, rErr);
	this.addUVs(pixRect);
	return this;
};

TexturedMesh.prototype.arc = function(r, dr, th, dth, pixRect, rErr) {
	Mesh.prototype.arc.call(this, r, dr, th, dth);
	this.addUVs(pixRect);
	return this;
};

TexturedLayer.prototype.font = function() { return new PixelFont(this); }

function PixelFont(layer) {
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
	var indices = [0, 1, 2,  2, 1, 3];
	for(var i=cp0; i<cp1; ++i) {  // "Code Points"
		var m = new TexturedMesh(vertices, [], indices);
		m.bounds.add(vertices[0], vertices[3]);
		m.addUVs(uvRect);
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

TexturedMesh.prototype.text = function(font, text) {
	var v = [];
	var transform = new Transform2D([0, 0]);
	for(var i=0; i<text.length; ++i) {
		var c = font.characters[text.charCodeAt(i)];
		var v0 = this.positions.length;

		var m = transform.matrix();
		for(var j=0; j<c.positions.length; ++j) {
			V2.transform(V2.copy(v, c.positions[j]), m);
			this.positions.push(v.slice());
			this.bounds.add(v);
			this.uvs.push(c.uvs[j]);
		}
		transform.move([c.bounds.r - c.bounds.l, 0]);

		for(var j=0; j<c.indices.length; ++j) {
			this.indices.push(v0 + c.indices[j]);
		}
	}
	return this;
}
