package twitter

const Url = "https://api.twitter.com/2/tweets/sample/stream?expansions=author_id,attachments.media_keys&media.fields=type,url"
const MinTweets = 50

type Media struct {
	Type		string	`json:"type"`
	Url			string	`json:"url"`
}

type User struct {
	Id			string	`json:"id"`
	Username	string	`json:"username"`
}

type Includes struct {
	Users		[]User	`json:"users"`
	Media		[]Media	`json:"media"`
}

type Data struct {
	Id			string	`json:"id"`
	Text		string	`json:"text"`
	AuthorId	string	`json:"author_id"`
}

type Tweet struct {
	Data 		Data	`json:"data"`
	Includes	Includes	`json:"includes"`
}

type FastTweet struct {
	Id			string	`json:"id"`
	Text		string	`json:"text"`
	Username	string	`json:"username"`
	MediaUrl	*string	`json:"media_url"`
}
