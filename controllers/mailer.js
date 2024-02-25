import dotenv from "dotenv";
dotenv.config({
    path:'../.env'
});

import nodemailer from "nodemailer";
import Mailgen from "mailgen";


// https://ethereal.email/create
let nodeConfig = {
  service: process.env.NODEMAILER_SERVICE,
  auth: {
    user: process.env.NODEMAILER_AUTH_USER,
    pass: process.env.NODEMAILER_AUTH_PASS,
  },
};

let transporter = nodemailer.createTransport(nodeConfig);

let MailGenerator = new Mailgen({
  theme: "default",
  product: {
    name: "CodeBox",
    link: "http://localhost:5173/",
  },
});

export const registerMail = async (req, res) => {
  const { username, userEmail, text, subject } = req.body;

  // body of the email
  var email = {
    body: {
      name: username,
      intro:
        text || "Welcome to CodeBox! We're very excited to have you on board.",
      outro:
        "Need help, or have questions? Just reply to this email, we'd love to help.",
    },
  };

  var emailBody = MailGenerator.generate(email);

  let message = {
    from: process.env.NODEMAILER_AUTH_USER,
    to: userEmail,
    subject: subject || "Signup Successful",
    html: emailBody,
  };

  // send mail
  transporter.sendMail(message)
  .then(() => {
      return res.status(200).send({ message: "You should receive an email from us."});
  })
  .catch(error => {
      console.error("Error sending email:", error);
      return res.status(500).send({ error });
  });

}
