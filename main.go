package main

import (
	"bufio"
	"encoding/json"
	"fmt"
	"github.com/oemel09/waytoofast/apis/freesound"
	"github.com/oemel09/waytoofast/apis/pexels"
	"github.com/oemel09/waytoofast/apis/twitter"
	"html/template"
	"io"
	"io/ioutil"
	"log"
	"math"
	"math/rand"
	"net/http"
	"os"
	"strings"
	"time"
)

const TemplatesDir = "TEMPLATES_DIR"
const StaticAssetsDir = "STATIC_ASSETS_DIR"
const ConfigFile = "CONFIG_FILE"
const Port = "PORT"
const PathPrefix = "PATH_PREFIX"

const QualityHigh = "xhd"
const QualityStandard = "sd"

const QualityLarge = "l"
const QualitySmall = "s"
const QualityTiny = "t"

var tpl *template.Template
var config Configuration

var port string
var pathPrefix string
var templatesDir = os.Getenv(TemplatesDir)
var staticAssetsDir = os.Getenv(StaticAssetsDir)
var configFile = os.Getenv(ConfigFile)

func init() {
	checkMandatoryEnvVars()
	checkOptionalEnvVars()
}

func checkMandatoryEnvVars() {
	if templatesDir == "" {
		log.Fatalln(TemplatesDir, "not set")
	} else if staticAssetsDir == "" {
		log.Fatalln(StaticAssetsDir, "not set")
	} else if configFile == "" {
		log.Fatalln(ConfigFile, "not set")
	}
}

func checkOptionalEnvVars() {
	var ok bool
	pathPrefix, ok = os.LookupEnv(PathPrefix)
	if ok {
		pathPrefix = "/" + pathPrefix
	}
	port, ok = os.LookupEnv(Port)
	if !ok {
		port = "61113"
	}
}

func main() {
	tpl = template.Must(template.ParseGlob(templatesDir + "/*"))
	config = loadConfiguration(configFile)

	http.HandleFunc("/", index)
	http.HandleFunc(pathPrefix+"/twitter", twitterAPI)
	http.HandleFunc(pathPrefix+"/pexels-videos", pexelsVideoAPI)
	http.HandleFunc(pathPrefix+"/pexels-images", pexelsImageAPI)
	http.HandleFunc(pathPrefix+"/free-sounds", freeSoundAPI)
	http.Handle(pathPrefix+"/assets/", disableDirectoryListing(
		changeHeaderThenServe(
			http.StripPrefix(pathPrefix+"/assets", http.FileServer(http.Dir(staticAssetsDir))))))
	log.Println("Started application on port", port)
	log.Fatal(http.ListenAndServe(":"+port, nil))
}

func disableDirectoryListing(h http.Handler) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if strings.HasSuffix(r.URL.Path, "/assets/") {
			io.WriteString(w, "404")
		} else {
			h.ServeHTTP(w, r)
		}
	}
}

func changeHeaderThenServe(h http.Handler) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var ct string
		if strings.HasSuffix(r.URL.Path, ".js") {
			ct = "text/javascript"
		} else if strings.HasSuffix(r.URL.Path, ".css") {
			ct = "text/css"
		}
		w.Header().Add("Content-Type", ct)
		h.ServeHTTP(w, r)
	}
}

func index(w http.ResponseWriter, r *http.Request) {
	err := tpl.ExecuteTemplate(w, "root.gohtml", pathPrefix)
	if err != nil {
		fmt.Println("Failed to render index template:", err)
	}
}

func twitterAPI(w http.ResponseWriter, r *http.Request) {
	twitterUrl := twitter.Url
	req, err := http.NewRequest(http.MethodGet, twitterUrl, nil)
	if err != nil {
		fmt.Println("Failed to initialize twitter request:", err)
	}
	req.Header.Add("Authorization", "Bearer "+config.Apis.Twitter.BearerToken)
	client := &http.Client{}
	res, err := client.Do(req)
	if err != nil {
		fmt.Println("Failed to perform twitter request:", err)
	}
	reader := bufio.NewReader(res.Body)

	var fastTweets []twitter.FastTweet
	for len(fastTweets) < twitter.MinTweets {
		line, err := reader.ReadBytes('\n')
		var tweet twitter.Tweet
		err = json.Unmarshal(line, &tweet)
		if err != nil {
			fmt.Println("Failed to unmarshal tweets:", err)
		}
		fastTweet := twitter.FastTweet{
			Id:       tweet.Data.Id,
			Text:     tweet.Data.Text,
			Username: getTwitterHandle(tweet.Data.AuthorId, tweet.Includes.Users),
			MediaUrl: getTwitterMedia(tweet),
		}
		fastTweets = append(fastTweets, fastTweet)
	}
	res.Body.Close()

	data, err := json.Marshal(fastTweets)
	if err != nil {
		fmt.Println("Failed to marshall tweet response:", err)
	}

	writeResponse(w, data)
}

func pexelsVideoAPI(w http.ResponseWriter, r *http.Request) {
	rand.Seed(time.Now().UnixNano())
	page := rand.Intn(pexels.TotalVideos/pexels.VideosPerPage) + 1
	videosUrl := fmt.Sprintf(pexels.VideoUrl, page, pexels.VideosPerPage, pexels.MaxDuration)
	pexelsVideosResponse := performRequest(config.Apis.Pexels.Name, videosUrl, config.Apis.Pexels.APIKey)

	var pexelsVideos pexels.PexelsVideos
	err := json.Unmarshal(pexelsVideosResponse, &pexelsVideos)
	if err != nil {
		fmt.Println("Failed to unmarshal pexels videos:", err)
	}

	var fastVideos []pexels.FastVideo
	quality := r.URL.Query().Get("q")
	for _, v := range pexelsVideos.Videos {
		videoFiles := filterVideoQuality(v.VideoFiles, func(vf pexels.VideoFile) bool {
			// quality may be one of: xsd, sd, hd, xhd
			// vf.Quality may be on of sd, hd
			return vf.FileType == "video/mp4" && strings.Contains(quality, vf.Quality)
		})
		vf := getBestVideoLink(videoFiles, quality)
		fast := pexels.FastVideo{
			Duration:  v.Duration,
			Link:      vf.Link,
			Width:     vf.Width,
			Height:    vf.Height,
			PexelsUrl: v.URL,
		}
		fastVideos = append(fastVideos, fast)
	}

	data, err := json.Marshal(fastVideos)
	if err != nil {
		fmt.Println("Failed to marshall pexels video response:", err)
	}
	writeResponse(w, data)
}

func pexelsImageAPI(w http.ResponseWriter, r *http.Request) {
	rand.Seed(time.Now().UnixNano())
	page := rand.Intn(pexels.ImageTotal/pexels.ImagesPerPage) + 1
	imagesUrl := fmt.Sprintf(pexels.ImageUrl, page, pexels.ImagesPerPage)
	pexelsImagesResponse := performRequest(config.Apis.Pexels.Name, imagesUrl, config.Apis.Pexels.APIKey)

	var pexelsImages pexels.PexelsImages
	err := json.Unmarshal(pexelsImagesResponse, &pexelsImages)
	if err != nil {
		fmt.Println("Failed to unmarshal pexels images:", err)
	}

	var fastImages []pexels.FastImage
	quality := r.URL.Query().Get("q")
	for _, v := range pexelsImages.Photos {
		link := getBestImageLink(v.Src, quality)
		fast := pexels.FastImage{
			Link:         link,
			Photographer: v.Photographer,
			PexelsUrl:    v.URL,
		}
		fastImages = append(fastImages, fast)
	}

	data, err := json.Marshal(fastImages)
	if err != nil {
		fmt.Println("Failed to marshall pexels image response:", err)
	}
	writeResponse(w, data)
}

func freeSoundAPI(w http.ResponseWriter, r *http.Request) {
	rand.Seed(time.Now().UnixNano())
	page := rand.Intn(freesound.SoundTotal/freesound.SoundsPerPage) + 1
	freeSoundUrl := freesound.SoundUrl + fmt.Sprintf(freesound.SoundParams, page, freesound.SoundsPerPage)
	freeSoundResponse := performRequest(config.Apis.FreeSound.Name, freeSoundUrl, "Token "+config.Apis.FreeSound.APIKey)

	var freeSounds freesound.FreeSounds
	err := json.Unmarshal(freeSoundResponse, &freeSounds)
	if err != nil {
		fmt.Println("Failed to unmarshal free sounds:", err)
	}

	var fastSounds []freesound.FastSounds
	for _, v := range freeSounds.Results {
		sound := freesound.FastSounds{
			Link:     v.Previews.PreviewLqMp3,
			Duration: int(v.Duration),
		}
		fastSounds = append(fastSounds, sound)
	}

	data, err := json.Marshal(fastSounds)
	if err != nil {
		fmt.Println("Failed to marshall fast sound response:", err)
	}
	writeResponse(w, data)
}

func performRequest(name string, uri string, authorization string) []byte {
	req, err := http.NewRequest(http.MethodGet, uri, nil)
	if err != nil {
		fmt.Printf("Failed to initialize %s request: %s\n", name, err)
	}
	req.Header.Add("Authorization", authorization)

	client := &http.Client{}
	res, err := client.Do(req)
	if err != nil {
		fmt.Printf("Failed to perform %s request: %s\n", name, err)
	}

	defer res.Body.Close()
	body, err := ioutil.ReadAll(res.Body)
	if err != nil {
		fmt.Printf("Failed to read %s response: %s\n", name, err)
	}
	return body
}

func writeResponse(w http.ResponseWriter, data []byte) {
	w.Header().Set("Content-Type", "application/json")
	_, err := io.WriteString(w, string(data))
	if err != nil {
		fmt.Println("Failed to write pexels videos response:", err)
	}
}

type videoQualityFilter func(pexels.VideoFile) bool

func filterVideoQuality(videos []pexels.VideoFile, f videoQualityFilter) (filtered []pexels.VideoFile) {
	for _, v := range videos {
		if f(v) {
			filtered = append(filtered, v)
		}
	}
	return
}

func getBestVideoLink(files []pexels.VideoFile, quality string) (bestLink pexels.VideoFile) {
	var bestQuality int
	var highest bool
	if quality == QualityHigh || quality == QualityStandard {
		bestQuality = 0
		highest = true
	} else {
		bestQuality = math.MaxInt64
		highest = false
	}
	for _, vf := range files {
		if highest && vf.Width > bestQuality || !highest && vf.Width < bestQuality {
			bestQuality = vf.Width
			bestLink = vf
		}
	}
	return
}

func getBestImageLink(src pexels.Source, quality string) string {
	if quality == QualityLarge {
		return src.Large
	} else if quality == QualitySmall {
		return src.Small
	} else if quality == QualityTiny {
		return src.Tiny
	} else {
		return src.Medium
	}
}

func getTwitterHandle(userId string, users []twitter.User) (handle string) {
	for _, u := range users {
		if userId == u.Id {
			handle = u.Username
			return
		}
	}
	return "404HandleNotFound"
}

func getTwitterMedia(tweet twitter.Tweet) (mediaUrl *string) {
	if len(tweet.Includes.Media) > 0 {
		urlString := tweet.Includes.Media[0].Url
		mediaUrl = &urlString
	}
	return
}
