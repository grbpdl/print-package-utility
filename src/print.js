"use strict";

const net = require("net");

function tcpPrint(host, port, content, jobId) {
  const sock = new net.Socket();
  sock.setTimeout(5000);
  sock.connect(port, host, () => {
    sock.setTimeout(0);
    sock.write(Buffer.from(content, "binary"), () => {
      sock.end();
    });
  });
  sock.on("close", () => {
    console.log(
      "[agent] job " + jobId + " → delivered to " + host + ":" + port,
    );
  });
  sock.on("error", (err) => {
    console.error("[agent] job " + jobId + " → TCP error: " + err.message);
    sock.destroy();
  });
  sock.on("timeout", () => {
    console.error("[agent] job " + jobId + " → TCP timeout");
    sock.destroy();
  });
}

module.exports = { tcpPrint };
