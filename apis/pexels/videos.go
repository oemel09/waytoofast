package pexels

const VideoUrl = "https://api.pexels.com/videos/popular?page=%d&per_page=%d&max_duration=%d"
const TotalVideos = 90000
const VideosPerPage = 50
const MaxDuration = 60

type User struct {
	ID   int    `json:"id"`
	Name string `json:"name"`
	URL  string `json:"url"`
}

type Video struct {
	ID       int    `json:"id"`
	Width    int    `json:"width"`
	Height   int    `json:"height"`
	URL      string `json:"url"`
	Image    string `json:"image"`
	Duration int    `json:"duration"`
	User     User	`json:"user"`
	VideoFiles []VideoFile `json:"video_files"`
}

type VideoFile struct {
	ID       int    `json:"id"`
	Quality  string `json:"quality"`
	FileType string `json:"file_type"`
	Width    int    `json:"width"`
	Height   int    `json:"height"`
	Link     string `json:"link"`
}

type PexelsVideos struct {
	Videos []Video `json:"videos"`
}

type FastVideo struct {
	Duration	int			`json:"duration"`
	Link		string		`json:"link"`
	Width		int			`json:"width"`
	Height		int			`json:"height"`
	PexelsUrl	string		`json:"url"`
}
