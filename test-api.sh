#!/bin/bash

curl http://localhost:11434/api/generate -d '{
  "model": "mistral:7b",
  "prompt": "Say OK",
  "stream": false
}'

