all: client.js server.js

client.js:
	rollup -c --input src/client.js > $@

server.js:
	rollup -c --input src/server.js > $@

clean:
	rm -rf server.js client.js

.PHONY: all clean server.js client.js
