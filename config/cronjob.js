const cron = require("node-cron");
const { User, Book } = require("../models");
const master = process.env.SUPERUSER_ID;
const { Op } = require("sequelize");
const client = require("../config/mailer");
const mysql = require("mysql2/promise");

function replaceObjectById(id, listOfObjects, newObject) {
  for (let i = 0; i < listOfObjects.length; i++) {
    if (listOfObjects[i].id === id) {
      listOfObjects[i] = newObject;
      return; // Exit the loop once the object is replaced
    }
  }
}

function setupCronJob() {
  cron.schedule(
    "0 2 * * *",
    async () => {
      try {
        //for logging users out

        //for notifictaion
        const notificationUsers = await User.findAll({});
        const notificationTime = new Date().getTime();
        notificationUsers.forEach(async (user) => {
          const notificationArray = user.dataValues.notification;

          notificationArray.forEach(async (notification) => {
            if (notificationTime > notification.expiryDate) {
              const newNotificationArray = notificationArray.filter(
                (notification) => notification.expiryDate > notificationTime
              );
              await user.update({ notification: newNotificationArray });
              await user.save();
            }
          });
        });

        const currentDate = new Date();
        // Find all users who have borrowed books
        const users = await User.findAll({
          where: {
            bookArray: {
              [Op.not]: null, // Users who have borrowed books
            },
          },
        });
        const superUser = await User.findOne({ where: { id: master } });

        // For each user, check if any borrowed book is overdue and incur a fine if necessary
        for (const user of users) {
          const properUser = await User.findOne({ where: { id: user.id } });
          const existingBooks = user.dataValues.bookArray;

          // Check each borrowed book's return date
          var totalPrice = 0;
          for (const book of existingBooks) {
            const returnDateString = book.returnDate;
            const returnDate = new Date(returnDateString);
            const isEmailed = book.fineLevied;
            const bookcid = book.id;
            const borrowedBook = await Book.findOne({ where: { id: book.id } });
            totalPrice += borrowedBook.dataValues.price;

            if (returnDate < currentDate) {
              if (!isEmailed) {
                const mailuser = process.env.MAILID;
                const email = user.dataValues.email;
                const sendEmail = {
                  from: mailuser,
                  to: email,
                  subject: "Fine levied",
                  html: `
              <body style="padding: 0;margin: 0;box-sizing: border-box;font-family: &quot;Poppins&quot;, sans-serif;">
                  <div>
                      <table
                          style="background: #F5F6F9;font-size: 14px;line-height: 22px;font-weight: 400;color: #56666D;width: 100%;text-align: center;padding-top: 30px;">
                          <tr>
                              <td>
                                  <table style="width: 96%;max-width: 620px;margin: 0 auto;background: #FFFFFF;padding: 40px;">
                                      <tbody>
                                          <tr>
                                              <td style="padding: 20px 0;">
                                                  <a href="#" style="color: #C7271E;word-break: break-all;">
                                                      <img class="logo-svg"
                                                          src="https://hireme.caandd.com/"
                                                          alt="" style="height: 40px;width: auto;">
                                                  </a>
                                              </td>
                                          </tr>
                                          <tr>
                                              <td>
                                                  <h2
                                                      style="font-size: 18px;color: #0E9E49;font-weight: 600;margin: 0;line-height: 1.4;">
                                                      New Message received</h2>
                                              </td>
                                          </tr>
                                          <tr>
                                              <td>
                                                  <p>Hello, ${user.dataValues.fullName}</p>
                                                  <p> You are late to submit the book ${borrowedBook.dataValues.name} 
                                                  </p>
                                                  <p>You will be levied nrp. ${borrowedBook.dataValues.fine} as fine.</p>
                                              </td>
                                          </tr>
                                          <tr>
                                              <td>
                                                  <p style="margin: 0;font-size: 12px;line-height: 22px;color: #56666D;">
                                                  This is an automatically generated email. Please do not reply to this email. If this message does not concern you, then please contact us. For all questions, please contact us at xxxxxx@xxxxgmailcom
                                                  </p>
                                              </td>
                                          </tr>
                                      </tbody>
                                  </table>
                                  <table style="width: 100%;max-width: 620px;margin: 0 auto;">
                                      <tbody>
                                          <tr>
                                              <td>
                                                  <p style="font-size: 13px;margin-top: 30px;">
                                                      Copyright
                                                      © 2023 Hire Me. All rights
                                                      reserved. <br>
                                                  </p>
                                                  <p>
                                                      This email was sent to you as a registered member of
                                                      <a href="https://hireme.caandd.com" style="color: #0E9E49;word-break: break-all;">Hire Me</a>
                                                  </p>
                                              </td>
                                          </tr>
                                      </tbody>
                                  </table>
                              </td>
                          </tr>
                      </table>
                  </div>
              </body>
              `,
                };
                client.sendMail(sendEmail, (err, info) => {
                  if (err) {
                    return res.json({ title: "mail error" });
                  }
                });
                const isFineLevied = true;
                const newBook = {
                  id: bookcid,
                  returnDate: returnDate,
                  fineLevied: isFineLevied,
                };
                replaceObjectById(bookcid, existingBooks, newBook);
                await properUser.update({ bookArray: existingBooks });
              }
              const fineAmount = calculateFine(
                returnDate,
                currentDate,
                borrowedBook.dataValues.fine
              );
              totalPrice += fineAmount;
            }
          }
          const updatedBalance = properUser.dataValues.balance - totalPrice;
          const updatedAdminBalance = superUser.dataValues.balance + totalPrice;
          console.log(updatedBalance, updatedAdminBalance);

          await user.update({ balance: updatedBalance });
          // update super user balance
          await superUser.update({ balance: updatedAdminBalance });
          if (updatedBalance < totalPrice) {
            const mailuser = process.env.MAILID;
            const email = user.dataValues.email;
            const sendEmail = {
              from: mailuser,
              to: email,
              subject: "Account suspension",
              html: `
              <body style="padding: 0;margin: 0;box-sizing: border-box;font-family: &quot;Poppins&quot;, sans-serif;">
                  <div>
                      <table
                          style="background: #F5F6F9;font-size: 14px;line-height: 22px;font-weight: 400;color: #56666D;width: 100%;text-align: center;padding-top: 30px;">
                          <tr>
                              <td>
                                  <table style="width: 96%;max-width: 620px;margin: 0 auto;background: #FFFFFF;padding: 40px;">
                                      <tbody>
                                          <tr>
                                              <td style="padding: 20px 0;">
                                                  <a href="#" style="color: #C7271E;word-break: break-all;">
                                                      <img class="logo-svg"
                                                          src="https://hireme.caandd.com/"
                                                          alt="" style="height: 40px;width: auto;">
                                                  </a>
                                              </td>
                                          </tr>
                                          <tr>
                                              <td>
                                                  <h2
                                                      style="font-size: 18px;color: #0E9E49;font-weight: 600;margin: 0;line-height: 1.4;">
                                                      New Message received</h2>
                                              </td>
                                          </tr>
                                          <tr>
                                              <td>
                                                  <p>Hello, ${user.dataValues.fullName}</p>
                                                  <p>You overused your funds to borrow books. Your account has been suspended.</p>
                                              </td>
                                          </tr>
                                          <tr>
                                              <td>
                                                  <p style="margin: 0;font-size: 12px;line-height: 22px;color: #56666D;">
                                                  This is an automatically generated email. Please do not reply to this email. If this message does not concern you, then please contact us. For all questions, please contact us at xxxxxx@xxxxgmailcom
                                                  </p>
                                              </td>
                                          </tr>
                                      </tbody>
                                  </table>
                                  <table style="width: 100%;max-width: 620px;margin: 0 auto;">
                                      <tbody>
                                          <tr>
                                              <td>
                                                  <p style="font-size: 13px;margin-top: 30px;">
                                                      Copyright
                                                      © 2023 Hire Me. All rights
                                                      reserved. <br>
                                                  </p>
                                                  <p>
                                                      This email was sent to you as a registered member of
                                                      <a href="https://hireme.caandd.com" style="color: #0E9E49;word-break: break-all;">Hire Me</a>
                                                  </p>
                                              </td>
                                          </tr>
                                      </tbody>
                                  </table>
                              </td>
                          </tr>
                      </table>
                  </div>
              </body>
              `,
            };
            client.sendMail(sendEmail, (err, info) => {
              if (err) {
                return res.json({ title: "mail error" });
              }
            });

            for (const book of existingBooks) {
              const returnBook = await Book.findOne({ where: { id: book.id } });
              await returnBook.update({
                stock: returnBook.dataValues.stock + 1,
              });
            }
            // if user balance is less than total price, suspend the user and return all the books
            await user.update({ suspended: true, bookArray: null });
          }
        }
        const waitusers = await User.findAll({
          where: {
            waitlist: {
              [Op.not]: null, // Users who have waited books
            },
          },
        });

        for (const waituser of waitusers) {
          const properUser = await User.findOne({
            where: { id: waituser.dataValues.id },
          });
          const existingBooks = waituser.dataValues.waitlist;
          // check if any of the book is in stock
          for (const book of existingBooks) {
            const properBook = await Book.findOne({ where: { id: book.id } });
            if (properBook.dataValues.stock > 0) {
              if (!book.isMailed) {
                const mailuser = process.env.MAILID;
                const email = waituser.dataValues.email;
                const sendEmail = {
                  from: mailuser,
                  to: email,
                  subject: "Book Availability",
                  html: `
                    <body style="padding: 0;margin: 0;box-sizing: border-box;font-family: &quot;Poppins&quot;, sans-serif;">
                        <div>
                            <table
                                style="background: #F5F6F9;font-size: 14px;line-height: 22px;font-weight: 400;color: #56666D;width: 100%;text-align: center;padding-top: 30px;">
                                <tr>
                                    <td>
                                        <table style="width: 96%;max-width: 620px;margin: 0 auto;background: #FFFFFF;padding: 40px;">
                                            <tbody>
                                                <tr>
                                                    <td style="padding: 20px 0;">
                                                        <a href="#" style="color: #C7271E;word-break: break-all;">
                                                            <img class="logo-svg"
                                                                src="https://hireme.caandd.com/"
                                                                alt="" style="height: 40px;width: auto;">
                                                        </a>
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td>
                                                        <h2
                                                            style="font-size: 18px;color: #0E9E49;font-weight: 600;margin: 0;line-height: 1.4;">
                                                            New Message received</h2>
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td>
                                                        <p>Hello, ${waituser.dataValues.fullName}</p>
                                                        <p>The book ${properBook.dataValues.name} is now available. You can collect it anytime.</p>
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td>
                                                        <p style="margin: 0;font-size: 12px;line-height: 22px;color: #56666D;">
                                                        This is an automatically generated email. Please do not reply to this email. If this message does not concern you, then please contact us. For all questions, please contact us at xxxxxx@xxxxgmailcom
                                                        </p>
                                                    </td>
                                                </tr>
                                            </tbody>
                                        </table>
                                        <table style="width: 100%;max-width: 620px;margin: 0 auto;">
                                            <tbody>
                                                <tr>
                                                    <td>
                                                        <p style="font-size: 13px;margin-top: 30px;">
                                                            Copyright
                                                            © 2023 Hire Me. All rights
                                                            reserved. <br>
                                                        </p>
                                                        <p>
                                                            This email was sent to you as a registered member of
                                                            <a href="https://hireme.caandd.com" style="color: #0E9E49;word-break: break-all;">Hire Me</a>
                                                        </p>
                                                    </td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                        </div>
                    </body>
                    `,
                };
                client.sendMail(sendEmail, (err, info) => {
                  if (err) {
                    return res.json({ title: "mail error" });
                  }
                });
                const isEmailSent = true;
                const newBook = {
                  id: properBook.dataValues.id,
                  isMailed: isEmailSent,
                };
                replaceObjectById(
                  properBook.dataValues.id,
                  existingBooks,
                  newBook
                );
                await properUser.update({ waitlist: existingBooks });
              }
            }
          }
        }
      } catch (error) {
        console.error("Error occurred while updating user balances:", error);
      }
    },
    {
      scheduled: true,
      timezone: "Asia/Kathmandu", // Set timezone to 'Asia/Kathmandu'
    }
  );
}

function calculateFine(returnDate, currentDate, finePerDay) {
  // Calculate the number of days overdue
  const timeDifference = currentDate.getTime() - returnDate.getTime();
  const daysOverdue = Math.ceil(timeDifference / (1000 * 60 * 60 * 24));

  // Fine calculation logic (adjust as needed)
  const fineAmount = daysOverdue * finePerDay;

  return Math.abs(fineAmount);
}

function separateCronJob() {
  cron.schedule(
    "*/15 * * * * *", // Cron expression for every 15 seconds
    async () => {
      try {
        const options = {
          host: process.env.HOST,
          port: 3306,
          user: "root",
          password: process.env.PASS,
          database: process.env.DATABASE,
        };
        const connection = await mysql.createConnection(options);
        try {
          const [rows] = await connection.execute("SELECT * FROM sessions"); // Replace 'sessions' with your actual session table name

          for (const row of rows) {
            const jsonObject = JSON.parse(row.data);
            const validId = jsonObject.passport?.user?.id;
            if (validId && validId !== "undefined") {
              try {
                const user = await User.findOne({ where: { id: validId } });
                if (user) {
                  const hertbeatTime = user.dataValues.hertbeatTime;
                  console.log(Date.now() - hertbeatTime);
                  if (Date.now() - hertbeatTime > 10000) {
                    await connection.execute(
                      "DELETE FROM sessions WHERE session_id = ?",
                      [row.session_id]
                    );
                    user.update({ hertbeatTime: null });
                    user.save();
                    console.log(`Deleted row with id ${row.session_id}`);
                  }
                }
              } catch (error) {
                console.error(
                  `Error processing row with id ${row.session_id}:`,
                  error
                );
              }
            }
          }
        } catch (error) {
          console.error("Error querying active sessions:", error);
        } finally {
          await connection.end();
        }
      } catch (error) {
        console.error("Error in cron job:", error);
      }
    }
  );
}

module.exports = { setupCronJob, separateCronJob };
