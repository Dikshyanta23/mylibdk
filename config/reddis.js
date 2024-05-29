const redis = require("redis");
const client = redis.createClient({ host: "localhost", port: 6379 });

client.on("error", (err) => {
  console.error("Redis error:", err);
});

module.exports = { client };
