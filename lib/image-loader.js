function LoadImage(url, onload) {
	if(onload) LoadImage.allLoaded = onload;
	var i = new Image;
	i.onload = LoadImage.imageCompleted;
	++LoadImage.waiting;
	i.src = url;
	return i;
}

LoadImage.waiting = 0;
LoadImage.allLoaded = false;

LoadImage.imageCompleted = function() {
	--LoadImage.waiting;
	if(LoadImage.allLoaded && LoadImage.waiting === 0) {
		LoadImage.allLoaded();
	}
}
