window.onload = () => init();

const PATH_PREFIX = ""

const BACKGROUND_PLAYBACK_RATE = 1.25;
const POP_UP_PLAYBACK_RATE = 2.0;

let MAX_POP_UP_VIDEOS_DISPLAY = 4;
let MAX_POP_UP_TWEETS_DISPLAY = 20;
let MAX_POP_UP_IMAGES_DISPLAY = 8;

const MIN_BACKGROUND_VIDEO_URLS = 7;
const MIN_BACKGROUND_IMAGE_URLS = 7;
const MIN_POP_UP_VIDEO_URLS = 7;
const MIN_POP_UP_TWEET_URLS = 15;
const MIN_POP_UP_IMAGE_URLS = 15;
const MIN_FREE_SOUND_URLS = 15;

const HIDDEN = 'hidden';

let loader;
let isMobile;
let width, height;
let apiRequests = [];
let backgroundLoaded = false;

let muted = true;
let soundToggleImage;
let speedMultiplier = 1, itemsMultiplier = 1;
let speedSlider, itemsSlider;

function getRandomInt(min, max) { // min and max included
    return Math.floor(Math.random() * (max - min + 1) + min);
}

function getRandomColor() {
    return '#' + (0x1000000 + (Math.random()) * 0xffffff).toString(16).substr(1, 6);
}

class Loader {

    constructor() {
        const loadingView = document.getElementById("loading-view");
        loadingView.style.marginTop = height / 2 - 100 + 'px';

        this.progressBar = document.getElementById("loading-progress");
        this.loadingText = document.getElementById("loading-text");
    }

    setUpLoadingBar() {
        this.progress = 1;
        this.loadingStage = 1;

        this.progressUpdater = setInterval(() => {
            this.progress += getRandomInt(1, 5);
            if (this.progress > 100) this.progress = 100;
            this.progressBar.style.width = this.progress + '%';
            this.loadingText.innerText = this.loadingText.innerText + '.';
            if (this.progress === 100) {
                this.loadingShouldBeDone();
            }
            this.updateLoadingText();
        }, 250);
    }

    loadingShouldBeDone() {
        if (this.isDataLoaded() && backgroundLoaded) {
            setTimeout(() => {
                clearInterval(this.progressUpdater);
                showAppView();
            }, 100);
        } else {
            this.loadingText.innerText = 'This is taking more time than expected...';
            this.progress = 30;
        }
    }

    updateLoadingText() {
        switch (this.loadingStage) {
            case 1:
                if (this.progress > 10 && this.progress <= 15) {
                    this.loadingText.innerText = 'Gathering data.';
                    this.loadingStage++;
                }
                break;
            case 2:
                if (this.isDataLoaded()) {
                    this.progress = 60;
                    this.loadingText.innerText = isMobile ? 'Fetching images.' : 'Fetching videos.';
                    this.loadingStage++;
                }
                break;
            case 3:
                if (this.progress > 80 && this.progress < 90) {
                    this.loadingText.innerText = 'Fetching sounds.';
                    this.loadingStage++;
                }
                break;
            case 4:
                if (backgroundLoaded) {
                    this.progress = 90;
                    this.loadingText.innerText = 'Almost done.';
                    this.loadingStage++;
                }
                break;
        }
    }

    isDataLoaded() {
        return apiRequests.every(r => r.isRunning);
    }
}

function showAppView() {
    const loadingView = document.getElementById("loading-view");
    loadingView.remove();
    const appView = document.getElementById("app-view");
    appView.classList.remove(HIDDEN);
    apiRequests.map(r => r.spawn());

    soundToggleImage = document.getElementById("sound-toggle-image");
    document.getElementById("sound-toggle").onclick = toggleSound;

    RangeTouch.setup(document.querySelectorAll("input"));
    speedSlider = document.getElementById("speed-slider");
    speedSlider.value = (Number(speedSlider.max) - Number(speedSlider.min)) / 2 + Number(speedSlider.min);
    speedSlider.oninput = (e) => {
        speedMultiplier = onSpeedSliderChanged(e);
        updatePlaybackSpeed();
    }
    itemsSlider = document.getElementById("items-slider");
    itemsSlider.value = (Number(itemsSlider.max) - Number(itemsSlider.min)) / 2 + Number(speedSlider.min);
    itemsSlider.oninput = (e) => itemsMultiplier = onItemsSliderChanged(e);
}

function toggleSound() {
    soundToggleImage.src = PATH_PREFIX + "/assets/" + (muted ? "speaker_on.png" : "speaker_off.png");
    muted = !muted;
    document.querySelectorAll("video").forEach(e => {
        e.muted = muted;
        if (!muted) {
            e.play();
        }
    });
    document.querySelectorAll("audio").forEach(e => {
        e.muted = muted;
        if (muted) {
            e.pause();
        } else {
            e.play()
        }
    });
}

function onSpeedSliderChanged(e) {
    return 2.0 * (Number(e.target.max) + Number(e.target.min) - Number(e.target.value)) / 100;
}

function onItemsSliderChanged(e) {
    return 2.0 * Number(e.target.value) / 100;
}

function updatePlaybackSpeed() {
    if (!isMobile) {
        for (let v of document.getElementsByClassName("background")) {
            v.playbackRate = BACKGROUND_PLAYBACK_RATE / speedMultiplier;
        }
    }
}

class ApiData {

    constructor(name, url) {
        this.name = name;
        this.url = PATH_PREFIX + url;
        this.requestData();
        this.isRunning = false;
    }

    requestData() {
        if (!this.requesting) {
            this.requesting = true;
            let req = fetch(this.url);
            req.then(res => res.json())
                .then(data => {
                    this.requesting = false;
                    this.updateData(data);
                    this.isRunning = true;
                })
                .catch(e => console.error(this.name, e));
        }
    }

    updateData(data) {
        console.log(this.name, "data has the correct format already", data);
    }

    spawn() {
        console.log(this.name, "this class can spawn", this.name);
    }

    setRandomPosition(element) {
        element.style.top = getRandomInt(-100, height + 100) + 'px';
        element.style.left = getRandomInt(-200, width + 200) + 'px';
    }

    removeWhenDone(element) {
        element.addEventListener('animationend', () => {
            element.remove();
        });
    }

    setRotation(element) {
        element.style.setProperty('--rotation-angle', getRandomInt(-25, 25) + 'deg');
    }
}

class Video extends ApiData {

    constructor(name, url) {
        super(name, url);
        this.videos = [];
    }

    updateData(data) {
        this.videos = this.videos.concat(data);
    }

    createVideoTag(...clazz) {
        const videoTag = document.createElement("video");
        videoTag.classList.add(...clazz);
        videoTag.autoplay = true;
        videoTag.muted = muted;
        videoTag.loop = true;
        return videoTag;
    }

    createVideoSource(url) {
        const source = document.createElement("source");
        source.src = url;
        source.type = "video/mp4";
        return source;
    }
}

class Image extends ApiData {

    constructor(name, url) {
        super(name, url);
        this.images = [];
    }

    updateData(data) {
        this.images = this.images.concat(data);
    }

    createImageTag(url, ...clazz) {
        const imageTag = document.createElement("img");
        imageTag.classList.add(...clazz);
        imageTag.src = url;
        return imageTag;
    }
}

class BackgroundVideo extends Video {

    constructor(name, url) {
        super(name, url);
        this.backgroundVideoBox = document.getElementById("background-box");
    }

    updateData(data) {
        super.updateData(data);
        this.loadVideo();
    }

    spawn() {
        if (this.isVideoLoaded) {
            const videoTag = this.loadingVideoTag;
            this.backgroundVideoBox.appendChild(videoTag);
            const playbackRate = BACKGROUND_PLAYBACK_RATE / speedMultiplier;
            videoTag.playbackRate = playbackRate;
            videoTag.play();
            if (this.backgroundVideoBox.childElementCount > 1) {
                this.backgroundVideoBox.removeChild(this.oldVideoTag);
            }
            this.oldVideoTag = videoTag;
            this.loadVideo();
            setTimeout(() => {
                this.spawn();
            }, this.getDisplayDuration(this.loadedVideo.duration, playbackRate));
        } else {
            setTimeout(() => this.spawn(), 1000);
        }
    }

    loadVideo() {
        this.isVideoLoaded = false;
        const index = getRandomInt(0, this.videos.length - 1);
        const video = this.videos[index];
        this.videos.splice(index, 1);

        this.loadingVideoTag = this.createVideoTag("background");
        const source = this.createVideoSource(video.link);
        this.loadingVideoTag.appendChild(source);
        this.loadingVideoTag.load();

        this.loadingVideoTag.oncanplaythrough = () => {
            this.loadedVideo = video;
            this.isVideoLoaded = true;
            backgroundLoaded = true;
        }

        if (this.videos.length < MIN_BACKGROUND_VIDEO_URLS) {
            this.requestData();
        }
    }

    getDisplayDuration(duration, playbackRate) {
        const minDuration = 8 * speedMultiplier;
        const maxDuration = 20 * speedMultiplier;
        if (duration < maxDuration) {
            return duration * 1000 / playbackRate;
        } else {
            return getRandomInt(minDuration, maxDuration) * speedMultiplier * 1000 / playbackRate;
        }
    }
}

class BackgroundImage extends Image {

    constructor(name, url) {
        super(name, url);
        this.backgroundImageBox = document.getElementById("background-box");
    }

    updateData(data) {
        super.updateData(data);
        this.loadImage();
    }

    spawn() {
        if (this.isImageLoaded) {
            const imageTag = this.loadingImageTag;
            this.backgroundImageBox.appendChild(imageTag);
            if (this.backgroundImageBox.childElementCount > 1) {
                this.backgroundImageBox.removeChild(this.oldImageTag);
            }
            this.oldImageTag = imageTag;
            this.loadImage();
            setTimeout(() => {
                this.spawn();
            }, getRandomInt(2000, 6000) * speedMultiplier);
        } else {
            setTimeout(() => this.spawn(), 1000);
        }
    }

    loadImage() {
        this.isImageLoaded = false;
        const index = getRandomInt(0, this.images.length - 1);
        const image = this.images[index];
        this.images.splice(index, 1);

        this.loadingImageTag = this.createImageTag(image.link, "background");
        this.loadingImageTag.onload = () => {
            this.isImageLoaded = true;
            backgroundLoaded = true;
        }

        if (this.images.length < MIN_BACKGROUND_IMAGE_URLS) {
            this.requestData();
        }
    }
}

class PopUpVideo extends Video {

    constructor(name, url) {
        super(name, url);
        this.videoBox = document.getElementById("videos-box");
    }

    spawn() {
        this.interval = setInterval(() => {
            if (this.videoBox.childElementCount < MAX_POP_UP_VIDEOS_DISPLAY * itemsMultiplier) {
                this.addPopUpVideo();
            }
            if (this.videos.length < MIN_POP_UP_VIDEO_URLS) {
                this.requestData();
            }
        }, getRandomInt(250, 750) * speedMultiplier);
    }

    addPopUpVideo() {
        const index = getRandomInt(0, this.videos.length - 1);
        const video = this.videos[index];
        this.videos.splice(index, 1);
        const videoTag = this.createVideoTag("pop-up", "pop-up-video");
        const source = this.createVideoSource(video.link);

        const randomWidth = getRandomInt(width / 10, width / 4);
        videoTag.style.width = randomWidth + 'px';
        this.setRandomPosition(videoTag);
        this.removeWhenDone(videoTag);
        const playbackRate = POP_UP_PLAYBACK_RATE / speedMultiplier;
        videoTag.playbackRate = playbackRate;
        videoTag.style.animationDuration = video.duration * 1000 / playbackRate + 'ms';
        videoTag.appendChild(source);

        this.videoBox.appendChild(videoTag);
    }
}

class PopUpImages extends Image {

    constructor(name, url) {
        super(name, url);
        this.images = [];
        this.imagesBox = document.getElementById("images-box");
    }

    spawn() {
        this.interval = setInterval(() => {
            if (this.imagesBox.childElementCount < MAX_POP_UP_IMAGES_DISPLAY * itemsMultiplier) {
                this.addPopUpImage();
            }

            if (this.images.length < MIN_POP_UP_IMAGE_URLS) {
                this.requestData();
            }
        }, getRandomInt(100, 400) * speedMultiplier);
    }

    addPopUpImage() {
        if (this.images.length > 0) {
            const index = getRandomInt(0, this.images.length - 1);
            const image = this.images[index];
            this.images.splice(index, 1);
            if (image === null) return;
            const imageTag = this.createImageTag(image.link, "pop-up", "pop-up-image");

            imageTag.style.animationDuration = getRandomInt(900, 4000) * speedMultiplier + 'ms';
            const randomWidth = getRandomInt(width / 8, width / 4);
            imageTag.style.width = randomWidth + 'px';

            this.setRandomPosition(imageTag);
            this.removeWhenDone(imageTag);
            this.setRotation(imageTag);
            this.imagesBox.appendChild(imageTag);
        }
    }
}

class Tweets extends ApiData {

    constructor(name, url) {
        super(name, url);
        this.tweets = [];
        this.tweetsBox = document.getElementById("tweets-box");
    }

    updateData(data) {
        this.tweets = this.tweets.concat(data);
    }

    spawn() {
        this.interval = setInterval(() => {
            if (this.tweetsBox.childElementCount < MAX_POP_UP_TWEETS_DISPLAY * itemsMultiplier) {
                this.addPopUpTweet();
            }

            if (this.tweets.length < MIN_POP_UP_TWEET_URLS) {
                this.requestData();
            }
        }, getRandomInt(100, 300) * speedMultiplier);
    }

    addPopUpTweet() {
        if (this.tweets.length > 0) {
            const index = getRandomInt(0, this.tweets.length - 1);
            const tweet = this.tweets[index];
            this.tweets.splice(index, 1);
            const tweetTag = this.createTweetTag(tweet);

            this.setRandomPosition(tweetTag);
            this.removeWhenDone(tweetTag);
            this.setRotation(tweetTag);
            this.tweetsBox.appendChild(tweetTag);
        }
    }

    createTweetTag(tweet) {
        const tweetTag = document.createElement("div");
        tweetTag.classList.add("pop-up", "pop-up-tweet");
        tweetTag.style.animationDuration = getRandomInt(2000, 6000) * speedMultiplier + 'ms';
        const tweetText = document.createElement("pre");
        tweetText.innerText = tweet.text;
        tweetText.classList.add("tweet-text");
        const tweetAuthor = document.createElement("pre");
        tweetAuthor.innerText = '@' + tweet.username;
        tweetAuthor.classList.add("tweet-author");
        tweetAuthor.style.color = getRandomColor();
        tweetTag.appendChild(tweetText);
        tweetTag.appendChild(tweetAuthor);
        return tweetTag;
    }
}

class FreeSounds extends ApiData {

    constructor(name, url) {
        super(name, url);
        this.sounds = [];
        this.soundsBox = document.getElementById("sounds-box");
    }

    updateData(data) {
        this.sounds = this.sounds.concat(data);
    }

    spawn() {
        this.addSound();
        this.addSound();
    }

    addSound() {
        const index = getRandomInt(0, this.sounds.length - 1);
        const sound = this.sounds[index];
        this.sounds.splice(index, 1);

        const soundTag = this.createSoundTag(sound);
        this.soundsBox.appendChild(soundTag);
        soundTag.onended = () => {
            soundTag.remove();
            this.addSound();
        }

        if (this.sounds.length < MIN_FREE_SOUND_URLS) {
            this.requestData();
        }
    }

    createSoundTag(sound) {
        const audioTag = document.createElement("audio");
        const sourceTag = document.createElement("source");
        sourceTag.src = sound.link;
        audioTag.appendChild(sourceTag);
        audioTag.muted = muted;
        if (!muted) {
            audioTag.play();
        }
        return audioTag;
    }
}

function init() {
    console.log("Hello World!");

    isMobile = navigator.userAgent.toLowerCase().includes('mobi');

    const viewContainer = document.getElementById("view-container");
    width = viewContainer.clientWidth;
    height = viewContainer.clientHeight;

    if (isMobile) {
        apiRequests.push(new BackgroundImage("background images", "/pexels-images?q=l"));
        apiRequests.push(new PopUpImages("images", "/pexels-images?q=t"));

        MAX_POP_UP_IMAGES_DISPLAY = Math.round(width / 200);
        MAX_POP_UP_TWEETS_DISPLAY = Math.round(width / 80);
    } else {
        apiRequests.push(new BackgroundVideo("background videos", "/pexels-videos?q=sd"));
        apiRequests.push(new PopUpVideo("videos", "/pexels-videos?q=xsd"));
        apiRequests.push(new PopUpImages("images", "/pexels-images?q=m"));

        MAX_POP_UP_VIDEOS_DISPLAY = Math.round(width / 500);
        MAX_POP_UP_IMAGES_DISPLAY = Math.round(width / 250);
        MAX_POP_UP_TWEETS_DISPLAY = Math.round(width / 100);
    }
    apiRequests.push(new Tweets("tweets", "/twitter"));
    apiRequests.push(new FreeSounds("sounds", "/free-sounds"));

    loader = new Loader();
    loader.setUpLoadingBar();
}
