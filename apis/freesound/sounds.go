package freesound

const SoundUrl = "https://freesound.org/apiv2/search/text/?query=&fields=duration,previews&filter=duration:[5%20TO%2025]"
const SoundParams = "&page=%d&page_size=%d"
const SoundTotal = 160000
const SoundsPerPage = 50

type Previews struct {
	PreviewLqOgg string `json:"preview-lq-ogg"`
	PreviewLqMp3 string `json:"preview-lq-mp3"`
	PreviewHqOgg string `json:"preview-hq-ogg"`
	PreviewHqMp3 string `json:"preview-hq-mp3"`
}

type Sound struct {
	Duration float64  `json:"duration"`
	Previews Previews `json:"previews"`
}

type FreeSounds struct {
	Results  []Sound     `json:"results"`
}

type FastSounds struct {
	Link     string `json:"link"`
	Duration int    `json:"duration"`
}
