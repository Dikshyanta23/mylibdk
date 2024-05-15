const express = require("express");
const { isAdmin } = require("../config/authentication");
const router = express.Router();
const { User, Book, Message, Transaction, Rate } = require("../models");
const { requireAuth } = require("../config/authentication");
const upload = require("../config/multer");
const user = require("../models/user");
const { where } = require("sequelize");
const e = require("express");
const { Op } = require("sequelize");

router.get("/", requireAuth, async (req, res) => {
  const messages = await Message.findAll({ where: { read: false } });
  // console.log(messages);
  res.render("about", { user: req.user, messages: messages });
});

router.get("/allusers", requireAuth, isAdmin, async (req, res) => {
  const allUsers = await User.findAll();
  const messages = await Message.findAll({ where: { read: false } });
  return res.render("allusers", {
    users: allUsers,
    user: req.user,
    messages: messages,
  });
});

router.get("/addbook", requireAuth, isAdmin, async (req, res) => {
  const messages = await Message.findAll({ where: { read: false } });
  return res.render("addbook", { user: req.user, messages: messages });
});

router.get("/allbooks", requireAuth, async (req, res) => {
  // console.log(req);
  const allBooks = await Book.findAll();
  // return res.json({ books: allBooks });
  const messages = await Message.findAll({ where: { read: false } });
  return res.render("allbooks", {
    books: allBooks,
    messages: messages,
    user: req.user,
    searchTerm: "",
  });
});

router.get("/search", async (req, res) => {
  const searchTerm = req.query.searchTerm;
  console.log(searchTerm);
  const messages = await Message.findAll({ where: { read: false } });
  const books = await Book.findAll({});

  try {
    if (searchTerm == "") {
      return res.render("allbooks", {
        books: books,
        messages: messages,
        user: req.user,
        searchTerm: searchTerm,
      });
    }
    const filteredBooks = await Book.findAll({
      where: {
        deleted_at: null,
        [Op.or]: [
          { name: { [Op.like]: `%${searchTerm}%` } },
          { author: { [Op.like]: `%${searchTerm}%` } },
        ],
      },
      attributes: [
        "id",
        "name",
        "price",
        "stock",
        "fine",
        "photo",
        "user_id",
        "author",
        "published_year",
        "genre",
        "created_at",
        "updated_at",
        "deleted_at",
      ],
    });
    console.log(filteredBooks);
    // res.redirect("/message");
    return res.render("allbooks", {
      books: filteredBooks,
      messages: messages,
      user: req.user,
      searchTerm: searchTerm,
    });
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.patch("/:userEmail", requireAuth, isAdmin, async (req, res) => {
  const { userEmail } = req.params;
  const { type } = req.body;
  const user = await User.findOne({ where: { email: userEmail } });
  if (!user) {
    return res.json({ title: "no user" });
  }
  if (type === "admin") {
    user.update(
      { isAdmin: !user.dataValues.isAdmin },
      { where: { email: userEmail } }
    );
  } else if (type === "suspend") {
    user.update(
      { suspended: !user.dataValues.suspended },
      { where: { email: userEmail } }
    );
  }
  await user.save();
  return res.json({ title: "success" });
});

router.delete("/:userEmail", requireAuth, isAdmin, async (req, res) => {
  const { userEmail } = req.params;
  const user = await User.findOne({ where: { email: userEmail } });
  if (!user) {
    return res.json({ title: "no user" });
  }
  user.destroy({ where: { email: userEmail } });

  const userDeleted = await user.save();

  if (userDeleted) {
    return res.json({ title: "success" });
  } else {
    return res.json({ title: "error in user save" });
  }
});

router.get("/edit/:userEmail", requireAuth, isAdmin, async (req, res) => {
  const { userEmail } = req.params;
  const user = await User.findOne({ where: { email: userEmail } });
  if (!user) {
    return res.json({ title: "no user" });
  }
  return res.render("edit", { user: user });
});

router.put("/edit/:userEmail", requireAuth, isAdmin, async (req, res) => {
  const { fullName, email, phone, suspended } = req.body;
  const { userEmail } = req.params;
  const user = await User.findOne({ where: { email: userEmail } });
  if (!user) {
    return res.json({ title: "no user" });
  }
  const suspendValue = suspended === "on" ? "true" : "false";
  user.update({ fullName, email, phone, suspended: suspendValue });

  const updatedUser = user.save();
  if (updatedUser) {
    return res.json({ title: "success" });
  } else {
    return res.json({ title: "update error" });
  }
});

router.post(
  "/addbook/upload",
  requireAuth,
  isAdmin,
  upload.single("photo"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ title: "photo upload error" });
      }

      const { name, price, stock, fine, author, genre, publishedyear } =
        req.body;
      if (
        !name ||
        !price ||
        !stock ||
        !fine ||
        !author ||
        !genre ||
        !publishedyear
      ) {
        return res.status(400).json({ title: "field error" });
      }

      const newBook = await Book.create({
        name,
        price,
        stock,
        fine,
        photo: `${process.env.BACKEND_URL}/uploads/book/${req.file.filename}`, // Assuming filename is stored in database
        userId: req.user.id,
        author,
        genre,
        publishedYear: publishedyear,
      });

      if (!newBook) {
        return res.status(500).json({ title: "create error" });
      }

      const user = await User.findOne({ where: { id: req.user.id } });

      if (!user) {
        return res.status(404).json({ title: "user not found" });
      }

      return res.json({ title: "success" });
    } catch (error) {
      console.error("Error:", error);
      return res.status(500).json({ title: "server error" });
    }
  }
);

router.delete("/allbooks/:bookId", requireAuth, isAdmin, async (req, res) => {
  const { bookId } = req.params;
  const book = await Book.findOne({ where: { id: bookId } });
  if (!book) {
    return res.json({ title: "not found" });
  }
  const deletedBook = await book.destroy({ where: { id: bookId } });
  if (!deletedBook) {
    return res.json({ title: "delete error" });
  }
  const saved = await book.save();
  if (!saved) {
    return res.json({ title: "save error" });
  }
  return res.json({ title: "success" });
});

router.get(
  "/allbooks/editbook/:bookId",
  requireAuth,
  isAdmin,
  async (req, res) => {
    const { bookId } = req.params;
    const book = await Book.findOne({ where: { id: bookId } });
    if (!book) {
      return res.json({ title: "not found" });
    }
    return res.render("editbook", { book: book });
  }
);

router.get("/allbooks/reviewbook/:bookId", requireAuth, async (req, res) => {
  const { bookId } = req.params;
  const book = await Book.findOne({ where: { id: bookId } });
  const messages = await Message.findAll({ where: { read: false } });

  if (!book) {
    return res.json({ title: "not found" });
  }
  return res.render("review", {
    book: book,
    user: req.user,
    messages: messages,
  });
});

router.post("/allbooks/reviewbook", requireAuth, async (req, res) => {
  console.log("chiryo");

  const { review, rating, bookId } = req.body;

  if (!bookId) {
    return res.json({ title: "not found" });
  }

  if (!review && !rating) {
    return res.json({ title: "missing values" });
  }

  if (review && rating) {
    const review = await Rate.create({
      isReview: true,
      bookId,
      userId: req.user.id,
      value: review,
    });

    const rate = await Rate.create({
      isReview: false,
      bookId,
      userId: req.user.id,
      value: rating.toString(),
    });

    if (!review || !rate) {
      return res.json({ title: "create error" });
    }

    return res.json({ title: "success" });
  } else if (review) {
    const review = await Rate.create({
      isReview: true,
      bookId,
      userId: req.user.id,
      value: review,
    });

    if (!review) {
      return res.json({ title: "create error" });
    }

    return res.json({ title: "success" });
  } else {
    const rate = await Rate.create({
      isReview: false,
      bookId,
      userId: req.user.id,
      value: rating.toString(),
    });

    if (!rate) {
      return res.json({ title: "create error" });
    }

    return res.json({ title: "success" });
  }
});

router.put("/allbooks/editbook/", requireAuth, isAdmin, async (req, res) => {
  const { id, name, price, stock, fine, author, genre, publishedyear } =
    req.body;
  const book = await Book.findOne({ where: { id: id } });
  if (!book) {
    return res.json({ title: "not found" });
  }
  const updatedBook = await book.update({
    name,
    price,
    stock,
    fine,
    author,
    genre,
    publishedYear: publishedyear,
  });
  if (!updatedBook) {
    return res.json({ title: "update error" });
  }
  const savedBook = await book.save();
  if (!savedBook) {
    return res.json({ title: "save error" });
  }
  return res.json({ title: "success" });
});

router.post("/allbooks/:id", requireAuth, async (req, res) => {
  const { id: bookId } = req.params;
  const book = await Book.findOne({ where: { id: bookId } });
  const user = await User.findOne({ where: { id: req.user.id } });
  if (!user || !book) {
    return res.json({ title: "not found" });
  }
  function isIdInArray(id, array) {
    if (!array) {
      return false;
    }
    return array.some((item) => item.id == id);
  }
  if (book.stock === 0) {
    const bookIdentifier = book.dataValues.id;
    const newWaitList = { id: bookIdentifier, isMailed: false };
    const existingWaitList = user.dataValues.waitlist;
    if (existingWaitList && existingWaitList.length >= 3) {
      return res.json({ title: "wait max limit" });
    }
    const preWaitedBook = isIdInArray(bookIdentifier, existingWaitList);
    if (preWaitedBook) {
      return res.json({ title: "pre waited" });
    }
    var newWait = [];
    if (existingWaitList) {
      newWait = [...existingWaitList, newBook];
    } else {
      newWait = [newWaitList];
    }
    user.update({ waitlist: newWait });
    return res.json({ title: "out of stock" });
  }

  const existingBooks = user.dataValues.bookArray;
  if (existingBooks && existingBooks.length >= 3) {
    return res.json({ title: "max limit" });
  }

  const preBorrowedBook = isIdInArray(bookId, existingBooks);
  if (preBorrowedBook) {
    return res.json({ title: "pre owned" });
  }
  const balance = user.dataValues.balance;
  const bookPrice = book.dataValues.price * 2;
  console.log(balance, bookPrice);
  if (balance < bookPrice) {
    return res.json({ title: "insufficient balance" });
  }

  const currentDate = new Date();
  currentDate.setDate(currentDate.getDate() + process.env.BORROW_TIME);
  const newBook = { id: bookId, returnDate: currentDate, fineLevied: false };
  var newBooks = [];
  if (existingBooks) {
    newBooks = [...existingBooks, newBook];
  } else {
    newBooks = [newBook];
  }
  const updatedUser = await user.update({ bookArray: newBooks });
  const updatedBook = await book.update({
    userId: req.user.id,
    stock: book.stock - 1,
  });
  if (!updatedUser || !updatedBook) {
    return res.json({ title: "update error" });
  }
  const savedUser = await user.save();
  const savedBook = await book.save();
  if (!savedUser || !savedBook) {
    return res.json({ title: "save error" });
  }
  return res.json({ title: "success" });
});

router.get("/mybooks", requireAuth, async (req, res) => {
  function convertDate(dateString) {
    const dateObj = new Date(dateString);
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, "0"); // Adding 1 because getMonth() returns zero-based month index
    const day = String(dateObj.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
  function calcBorrowedDate(dateString) {
    const dateObject = new Date(dateString);
    const dateObj = new Date(
      dateObject.getTime() - process.env.BORROW_TIME * process.env.TIME_COEFF
    );
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, "0"); // Adding 1 because getMonth() returns zero-based month index
    const day = String(dateObj.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
  function calculateFine(dateString, fineVal) {
    const currentDate = new Date();
    const inputDate = new Date(dateString);

    // Check if the input date is in the future
    if (inputDate > currentDate) {
      return 0; // Return 0 if date is in the future
    } else {
      // Calculate the difference in days
      const differenceInTime = currentDate.getTime() - inputDate.getTime();
      const differenceInDays = Math.ceil(differenceInTime / (1000 * 3600 * 24));

      // Calculate fine (assuming $3 fine per day)
      const fine = differenceInDays * fineVal;
      return fine; // Return the fine amount
    }
  }
  const bookArray = req.user.bookArray || [];
  const fetchBooks = bookArray.map(async (book) => {
    const bookie = await Book.findOne({ where: { id: book.id } });
    bookie.returnDate = convertDate(book.returnDate);
    bookie.borrowedDay = calcBorrowedDate(book.returnDate);
    bookie.fineIncurred = calculateFine(book.returnDate, bookie.fine);
    return bookie;
  });
  const books = await Promise.all(fetchBooks);
  const messages = await Message.findAll({ where: { read: false } });
  return res.render("mybooks", {
    books: books,
    user: req.user,
    messages: messages,
  });
});

router.post("/mybooks/:bookId", requireAuth, async (req, res) => {
  const { bookId } = req.params;
  const book = await Book.findOne({ where: { id: bookId } });
  const user = await User.findOne({ where: { id: req.user.id } });
  if (!user || !book) {
    return res.json({ title: "not found" });
  }
  const existingBooks = user.dataValues.bookArray;
  const isBookInArray = existingBooks.some((item) => item.id == bookId);
  if (!existingBooks && !isBookInArray) {
    return res.json({ title: "item error" });
  }
  const newBooks = existingBooks.filter((item) => item.id != bookId);
  const updatedUser = await user.update({ bookArray: newBooks });
  const updatedBook = await book.update({ stock: book.stock + 1 });
  if (!updatedUser || !updatedBook) {
    return res.json({ title: "update error" });
  }
  const savedUser = await user.save();
  const savedBook = await book.save();
  if (!savedUser || !savedBook) {
    return res.json({ title: "save error" });
  }
  return res.json({ title: "success" });
});

router.get("/transactions", requireAuth, async (req, res) => {
  const isAdmin = req.user.isAdmin;
  const messages = await Message.findAll({ where: { read: false } });

  if (isAdmin) {
    const transactions = await Transaction.findAll({
      where: { nature: "unprocessed" },
    });
    const transactionSet = await Promise.all(
      transactions.map(async (transaction) => {
        const transactionId = transaction.id;
        const amount = transaction.amount;
        const userId = transaction.userId;
        const user = await User.findOne({ where: { id: userId } });
        const name = user.dataValues.fullName;
        return { transactionId, amount, name };
      })
    );
    return res.render("admintransactions", {
      messages: messages,
      user: req.user,
      transactions: transactionSet,
    });
  }

  return res.render("usertransactions", { messages: messages, user: req.user });
});

router.post("/transactions", requireAuth, async (req, res) => {
  const messages = await Message.findAll({ where: { read: false } });
  const { transaction } = req.body;
  if (!transaction) {
    return res.json({ title: "no transaction" });
  }
  const preTrans = await Transaction.findOne({
    where: { userId: req.user.id, nature: "unprocessed" },
  });
  if (preTrans) {
    return res.json({ title: "already exists" });
  }
  const newTransaction = await Transaction.create({
    nature: "unprocessed",
    amount: transaction,
    userId: req.user.id,
  });
  if (!newTransaction) {
    return res.json({ title: "create error" });
  }
  return res.json({ title: "success" });
});

router.post(
  "/transactions/handletransaction",
  requireAuth,
  isAdmin,
  async (req, res) => {
    const { transactionId, action, amount } = req.body;
    if (!transactionId || !action || !amount) {
      return res.json({ title: "no transaction" });
    }
    if (action == "reject") {
      const transaction = await Transaction.findOne({
        where: { id: transactionId },
      });
      const updatedTransaction = await transaction.update({
        nature: "processed",
      });
      const savedTransaction = await transaction.save();
      if (!updatedTransaction || !savedTransaction) {
        return res.json({ title: "update y save error" });
      }
      return res.json({ title: "reject" });
    }
    const transaction = await Transaction.findOne({
      where: { id: transactionId },
    });
    const user = await User.findOne({ where: { id: transaction.userId } });
    if (!transaction || !user) {
      return res.json({ title: "not found" });
    }
    const updatedUser = await user.update({
      balance: user.dataValues.balance + Number(amount),
    });
    const updatedTransaction = await transaction.update({
      nature: "processed",
    });
    if (!updatedUser || !updatedTransaction) {
      return res.json({ title: "update error" });
    }
    const savedUser = await user.save();
    const savedTransaction = await transaction.save();
    if (!savedUser || !savedTransaction) {
      return res.json({ title: "save error" });
    }
    return res.json({ title: "success" });
  }
);

router.get("/messages", requireAuth, isAdmin, async (req, res) => {
  const allMessages = await Message.findAll();
  const messages = await Message.findAll({ where: { read: false } });
  const readMessages = await Promise.all(
    messages.map(async (message) => {
      // Update read value
      message.read = true;
      // Save the updated message
      await message.save();
      // Return the updated message
      return message;
    })
  );

  const selectedMessage = allMessages[0];
  res.render("messages", {
    messages: [],
    allMessages: allMessages,
    user: req.user,
    selectedMessage: selectedMessage,
  });
});

module.exports = router;
