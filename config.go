package main

import (
	"encoding/json"
	"fmt"
	"os"
)

type Configuration struct {
	Apis struct {
		Twitter struct {
			Name         string `json:"name"`
			BearerToken  string `json:"bearer-token"`
		} `json:"twitter"`
		Pexels struct {
			Name		string `json:"name"`
			APIKey		string `json:"api-key"`
		}
		FreeSound struct{
			Name		string `json:"name"`
			APIKey		string `json:"api-key"`
		}
	} `json:"apis"`
}

func loadConfiguration(configPath string) Configuration {
	file, _ := os.Open(configPath)
	defer file.Close()
	configuration := Configuration{}
	err := json.NewDecoder(file).Decode(&configuration)
	if err != nil {
		fmt.Println("error:", err)
	}
	return configuration
}
