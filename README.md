# Join.The.Dots - Core

nats stream add "agent-input" --subjects "test.*.input" --storage file --retention limits
docker run -p 4222:4222 -v c:/volumes/nats_data:/data nats:latest -js --sd /data
docker run -p 4222:4222 -v c:/volumes/nats_data:/data nats:latest -js --sd /data
