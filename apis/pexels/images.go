package pexels

const ImageUrl = "https://api.pexels.com/v1/search?query=lifestyle,nature&page=%d&per_page=%d"
const ImageTotal = 10000
const ImagesPerPage = 50

type Source struct {
	Large  string `json:"large"`
	Medium string `json:"medium"`
	Small  string `json:"small"`
	Tiny   string `json:"tiny"`
}

type Photo struct {
	ID           int    `json:"id"`
	Width        int    `json:"width"`
	Height       int    `json:"height"`
	URL          string `json:"url"`
	Photographer string `json:"photographer"`
	Src          Source `json:"src"`
}

type PexelsImages struct {
	Photos []Photo `json:"photos"`
}

type FastImage struct {
	Link         string `json:"link"`
	Photographer string `json:"photographer"`
	PexelsUrl    string `json:"url"`
}
