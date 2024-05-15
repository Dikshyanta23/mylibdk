const nodemailer = require("nodemailer");

const client = nodemailer.createTransport({
  host: "smtp.yoddhalab.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.MAILID,
    pass: process.env.MAILPASS,
  },
  tls: {
    rejectUnauthorized: false,
  },
});

client.verify(function (error, success) {
  if (error) {
    console.log("Can't verify email", error);
  } else {
    console.log("Server is ready for messages");
  }
});

module.exports = client;
