const express = require("express");
const { isAdmin } = require("../config/authentication");
const router = express.Router();
const {
  User,
  Book,
  Message,
  Transaction,
  Rate,
  Payment,
} = require("../models");
const { requireAuth } = require("../config/authentication");
const upload = require("../config/multer");
const user = require("../models/user");
const { where, UUID } = require("sequelize");
const e = require("express");
const { Op, Sequelize } = require("sequelize");
const { v4: uuidv4 } = require("uuid");
const Pusher = require("pusher");

async function getUserRating(bookId) {
  const rates = await Rate.findAll({
    where: { bookId: bookId },
  });
  const sum = rates.reduce(
    (acc, rate) => acc + Number(rate.dataValues.rating),
    0
  );
  const rating = sum / rates.length;
  if (!rating) {
    return 0;
  }
  return rating;
}

async function drillReviews(bookList) {
  const newBooks = await Promise.all(
    bookList.map(async (book) => {
      book.dataValues.rating = await getUserRating(book.dataValues.id);
      return book;
    })
  );
  return newBooks;
}

async function drillName(commentList) {
  const newBooks = await Promise.all(
    commentList.map(async (comment) => {
      const user = await User.findOne({
        where: { id: comment.dataValues.userId },
      });
      const username = user.dataValues.fullName;
      comment.dataValues.name = username;
      return comment;
    })
  );
  return newBooks;
}
function filterNotifications(list) {
  if (list) {
    return list.filter((item) => item.read == false);
  } else {
    return [];
  }
}
async function createNotification(user, message) {
  const newNotification = {
    id: uuidv4(),
    message: message,
    expiryDate: new Date().setDate(new Date().getDate() + 7),
    read: false,
  };

  const existingNotifications = user.dataValues.notification || [];
  let updatedNotifications = [];
  if (existingNotifications) {
    updatedNotifications = [...existingNotifications, newNotification];
  } else {
    updatedNotifications = [newNotification];
  }
  const updatedUser = await user.update({ notification: updatedNotifications });
  if (!updatedUser) {
    return false;
  }
  const savedUser = await user.save();
  if (!savedUser) {
    return false;
  }
  return true;
}
async function drillReplies(comments) {
  const newComments = await Promise.all(
    comments.map(async (comment) => {
      const replies = await Rate.findAll({
        where: { parent_id: comment.dataValues.id },
      });
      const newReplies = await drillName(replies);

      let superReplies = [];
      const updatedReplies = newReplies.map((reply) => {
        const instance = {
          name: reply.dataValues.name,
          value: reply.dataValues.value,
          id: reply.dataValues.id,
        };
        superReplies.push(instance);
      });
      comment.dataValues.replies = superReplies;
      return comment;
    })
  );
  return newComments;
}
function drillVoteCount(comments) {
  const newComments = comments.map((comment) => {
    const voteArray = comment.dataValues.votes;
    let upCount = 0;
    let downCount = 0;
    if (voteArray && voteArray.length > 0) {
      voteArray.forEach((vote) => {
        if (vote.type === "up") {
          upCount++;
        } else {
          downCount++;
        }
      });
    }
    comment.dataValues.upCount = upCount;
    comment.dataValues.downCount = downCount;
    return comment;
  });
  return newComments;
}

function getRandomItems(arr, numItems) {
  let shuffled = arr.slice(); // Create a copy of the array
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]; // Swap elements
  }
  return shuffled.slice(0, numItems);
}

router.get("/", requireAuth, async (req, res) => {
  const messages = await Message.findAll({ where: { read: false } });
  const notifications = filterNotifications(req.user.notification) || [];
  res.render("about", {
    user: req.user,
    messages: messages,
    notifications: notifications,
  });
});

router.get("/allusers", requireAuth, isAdmin, async (req, res) => {
  const allUsers = await User.findAll();
  const messages = await Message.findAll({ where: { read: false } });
  const notifications = filterNotifications(req.user.notification) || [];
  return res.render("allusers", {
    users: allUsers,
    user: req.user,
    messages: messages,
    notifications: notifications,
  });
});

router.get("/addbook", requireAuth, isAdmin, async (req, res) => {
  const messages = await Message.findAll({ where: { read: false } });
  const notifications = filterNotifications(req.user.notification) || [];
  return res.render("addbook", {
    user: req.user,
    messages: messages,
    notifications: notifications,
  });
});

router.post("/upvote", async (req, res) => {
  const { commentId } = req.body;
  const comment = await Rate.findOne({ where: { id: commentId } });
  const user = await User.findOne({ where: { id: req.user.id } });
  const uploader = await User.findOne({
    where: { id: comment.dataValues.userId },
  });
  if (!comment || !user || !uploader) {
    return res.json({ title: "not found" });
  }
  let existingVotes = comment.dataValues.votes;
  let newVotes = [];
  if (!existingVotes) {
    const newVote = {
      id: user.dataValues.id,
      type: "up",
      name: user.dataValues.fullName,
    };
    newVotes = [newVote];
  } else {
    const preVote = existingVotes.filter(
      (vote) => vote.id == user.dataValues.id
    );
    if (preVote.length > 0) {
      if (preVote[0].type === "up") {
        return res.json({ title: "already upvoted" });
      }
      const newVote = {
        id: user.dataValues.id,
        type: "up",
        name: user.dataValues.fullName,
      };
      const filteredVotes = existingVotes.filter(
        (vote) => vote.id !== user.dataValues.id
      );
      newVotes = [...filteredVotes, newVote];
    } else {
      const newVote = {
        id: user.dataValues.id,
        type: "up",
        name: user.dataValues.fullName,
      };
      newVotes = [...existingVotes, newVote];
    }
    const updatedComment = await comment.update({ votes: newVotes });
    const savedComment = await comment.save();
    if (!updatedComment || !savedComment) {
      return res.json({ title: "update error" });
    }

    if (uploader.dataValues.id !== user.dataValues.id) {
      const uploaderMessage = `${user.dataValues.fullName} upvoted your comment`;
      const uploaderNotified = await createNotification(
        uploader,
        uploaderMessage
      );
    }
    return res.json({ title: "success" });
  }
});

router.post("/getupvoters", async (req, res) => {
  const { commentId } = req.body;
  const comment = await Rate.findOne({ where: { id: commentId } });
  if (!comment) {
    return res.json({ title: "not found" });
  }
  const totalVotes = comment.dataValues.votes || [];
  if (totalVotes) {
    const upVoters = totalVotes.filter((vote) => vote.type === "up");
    const newUpVoters = upVoters.map((voter) => voter.name);
    return res.json({ title: "success", voters: newUpVoters });
  }
});

router.post("/getdownvoters", async (req, res) => {
  const { commentId } = req.body;
  const comment = await Rate.findOne({ where: { id: commentId } });
  if (!comment) {
    return res.json({ title: "not found" });
  }
  const totalVotes = comment.dataValues.votes || [];
  if (totalVotes) {
    const upVoters = totalVotes.filter((vote) => vote.type === "down");
    const newUpVoters = upVoters.map((voter) => voter.name);
    return res.json({ title: "success", voters: newUpVoters });
  }
});

router.post("/downvote", async (req, res) => {
  const { commentId } = req.body;
  const comment = await Rate.findOne({ where: { id: commentId } });
  const user = await User.findOne({ where: { id: req.user.id } });
  const uploader = await User.findOne({
    where: { id: comment.dataValues.userId },
  });
  if (!comment || !user || !uploader) {
    return res.json({ title: "not found" });
  }
  let existingVotes = comment.dataValues.votes;
  let newVotes = [];
  if (!existingVotes) {
    const newVote = {
      id: user.dataValues.id,
      type: "down",
      name: user.dataValues.fullName,
    };
    newVotes = [newVote];
  } else {
    const preVote = existingVotes.filter(
      (vote) => vote.id == user.dataValues.id
    );
    if (preVote.length > 0) {
      if (preVote[0].type === "down") {
        return res.json({ title: "already downvoted" });
      }
      const newVote = {
        id: user.dataValues.id,
        type: "down",
        name: user.dataValues.fullName,
      };
      const filteredVotes = existingVotes.filter(
        (vote) => vote.id !== user.dataValues.id
      );
      newVotes = [...filteredVotes, newVote];
    } else {
      const newVote = {
        id: user.dataValues.id,
        type: "down",
        name: user.dataValues.fullName,
      };
      newVotes = [...existingVotes, newVote];
    }
    const updatedComment = await comment.update({ votes: newVotes });
    const savedComment = await comment.save();
    if (!updatedComment || !savedComment) {
      return res.json({ title: "update error" });
    }
    if (uploader.dataValues.id !== user.dataValues.id) {
      const uploaderMessage = `${user.dataValues.fullName} downvoted your comment`;
      const uploaderNotified = await createNotification(
        uploader,
        uploaderMessage
      );
    }

    return res.json({ title: "success" });
  }
});

router.get("/subcomments/:commentId", requireAuth, async (req, res) => {
  const { commentId } = req.params;
  const subComments = await Rate.findAll({ where: { parentId: commentId } });
  const newSubComments = await drillName(subComments);

  return res.json({ comments: newSubComments });
});

router.get("/allbooks", requireAuth, async (req, res) => {
  // console.log(req);
  const allBooks = await Book.findAll();
  const newBooks = await drillReviews(allBooks);
  const user = await User.findOne({ where: { id: req.user.id } });

  // return res.json({ books: allBooks });
  const messages = await Message.findAll({ where: { read: false } });
  const notifications = filterNotifications(req.user.notification) || [];

  return res.render("allbooks", {
    books: newBooks,
    array: user.dataValues.bookArray || [],
    messages: messages,
    user: req.user,
    searchTerm: "",
    notifications: notifications,
  });
});

router.get("/search", async (req, res) => {
  const { searchTerm, filters } = req.query;
  let filterArray = [];
  let convertedArray = [];
  let isFilter = false;
  if (filters) {
    if (filters.includes(",")) {
      filterArray = filters.split(",");
    } else {
      filterArray = [filters];
    }
    convertedArray = filterArray.map((value) => {
      switch (value) {
        case "title":
          return "name";
        case "year":
          return "publishedYear";
        default:
          return value;
      }
    });
    isFilter = true;
  }
  const messages = await Message.findAll({ where: { read: false } });
  const notifications = filterNotifications(req.user.notification) || [];
  const books = await Book.findAll({});

  try {
    if (searchTerm == "") {
      return res.render("allbooks", {
        books: await drillReviews(books),
        messages: messages,
        user: req.user,
        searchTerm: searchTerm,
        notifications: notifications,
      });
    }
    if (filterArray.length > 0) {
      const searchConditions = convertedArray.map((field) => ({
        [field]: { [Op.like]: `%${searchTerm}%` },
      }));

      // Construct the where clause
      const whereClause = {
        deleted_at: null,
        [Op.or]: searchConditions,
      };

      // Example usage in a Sequelize query
      const results = await Book.findAll({
        where: whereClause,
      });
      return res.render("allbooks", {
        books: await drillReviews(results),
        messages: messages,
        user: req.user,
        searchTerm: searchTerm,
        notifications: notifications,
      });
    }
    const filteredBooks = await Book.findAll({
      where: {
        deleted_at: null,
        [Op.or]: [
          { name: { [Op.like]: `%${searchTerm}%` } },
          { author: { [Op.like]: `%${searchTerm}%` } },
          { publishedYear: { [Op.like]: `%${searchTerm}%` } },
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
    // console.log(filteredBooks);
    // res.redirect("/message");
    return res.render("allbooks", {
      books: await drillReviews(filteredBooks),
      messages: messages,
      user: req.user,
      searchTerm: searchTerm,
      notifications: notifications,
    });
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/messages", requireAuth, isAdmin, async (req, res) => {
  const allMessages = await Message.findAll();
  const messages = await Message.findAll({ where: { read: false } });
  const notifications = filterNotifications(req.user.notification) || [];
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
    notifications: notifications,
  });
});

router.get("/notification", requireAuth, async (req, res) => {
  try {
    const messages = await Message.findAll({ where: { read: false } });
    const user = await User.findOne({ where: { id: req.user.id } });

    if (!user) {
      return res.json({ title: "not found" });
    }

    const allNotifications = user.dataValues.notification || [];
    const reversedNotification = [...allNotifications].reverse();
    const readNotifications = allNotifications.map((notification) => {
      notification.read = true;
      return notification;
    });

    const updatedUser = await User.update(
      { notification: readNotifications },
      { where: { id: req.user.id } }
    );
    const savedUser = await user.save();
    user.changed("notification", true);

    // console.log(updatedUser.dataValues.notification);
    if (!savedUser || !updatedUser) {
      return res.json({ title: "update error" });
    }

    return res.render("notification", {
      user: req.user,
      messages: messages,
      allnotifications: reversedNotification,
      notifications: filterNotifications(readNotifications),
      selectedMessage: reversedNotification[0],
    });
  } catch (error) {
    console.error("Error updating notifications:", error);
    return res.json({ title: "update error", error: error.message });
  }
});

router.patch("/:userEmail", requireAuth, isAdmin, async (req, res) => {
  const { userEmail } = req.params;
  const { type } = req.body;
  const user = await User.findOne({ where: { email: userEmail } });
  if (!user) {
    return res.json({ title: "no user" });
  }
  let message = "";
  if (type === "admin") {
    const primaryAdmin = user.dataValues.isAdmin;
    user.update({ isAdmin: !primaryAdmin }, { where: { email: userEmail } });
    message = `User ${userEmail} has been ${
      primaryAdmin === true ? "revoked" : "granted"
    } admin privileges`;
  } else if (type === "suspend") {
    const primarySuspend = user.dataValues.suspended;
    user.update(
      { suspended: !primarySuspend },
      { where: { email: userEmail } }
    );
    message = `You have has been ${
      primarySuspend === true ? "unsuspended" : "suspended"
    }`;
  }
  await user.save();

  const notifiedUser = await createNotification(user, message);

  return res.json({ title: "success" });
});

router.post("/getreplies", async (req, res) => {
  const { commentId } = req.body;
  const replies = await Rate.findAll({ where: { parentId: commentId } });
  const newReplies = await drillName(replies);
  const evenNewerReplies = await drillVoteCount(newReplies);
  return res.json({ replies: evenNewerReplies });
});

router.delete("/:userEmail", requireAuth, isAdmin, async (req, res) => {
  const { userEmail } = req.params;
  const user = await User.findOne({ where: { email: userEmail } });
  const adminUsers = await User.findAll({ where: { isAdmin: true } });
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
  const messages = await Message.findAll({ where: { read: false } });
  const notifications = filterNotifications(req.user.notification) || [];
  if (!user) {
    return res.json({ title: "no user" });
  }
  return res.render("edit", {
    user: user,
    messages: messages,
    notifications: notifications,
  });
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
    const message = `Your details have been updated by an admin`;
    const notifiedUser = await createNotification(user, message);
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
      const message = `Book ${name} has been added to the library`;
      const allUsers = await User.findAll();
      allUsers.forEach(async (admin) => {
        const userNotified = await createNotification(admin, message);
        if (!userNotified) {
          return res.json({ title: "notification error" });
        }
      });
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
  const bookName = book.dataValues.name;
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
  const message = `Book ${bookName} has been deleted`;
  const users = await User.findAll();
  users.forEach(async (admin) => {
    const userNotified = await createNotification(admin, message);
    if (!userNotified) {
      return res.json({ title: "notification error" });
    }
  });
  return res.json({ title: "success" });
});

router.post("/allbooks/reply", requireAuth, async (req, res) => {
  const { bookId, commentId, reply } = req.body;
  const book = await Book.findOne({ where: { id: bookId } });
  const comment = await Rate.findOne({ where: { id: commentId } });
  const commenter = await User.findOne({
    where: { id: comment.dataValues.userId },
  });
  const replier = await User.findOne({ where: { id: req.user.id } });
  if (!book) {
    return res.json({ title: "book not found" });
  }

  if (!comment) {
    return res.json({ title: "comment not found" });
  }
  const newRate = await Rate.create({
    bookId: bookId,
    userId: req.user.id,
    value: reply,
    parentId: commentId,
  });
  if (!newRate) {
    return res.json({ title: "create error" });
  }
  const commenterNotify = `${replier.dataValues.fullName} replied to your comment`;
  const commenterNotified = await createNotification(
    commenter,
    commenterNotify
  );
  return res.json({ title: "success" });
});

router.get(
  "/allbooks/editbook/:bookId",
  requireAuth,
  isAdmin,
  async (req, res) => {
    const { bookId } = req.params;
    const book = await Book.findOne({ where: { id: bookId } });
    const user = await User.findOne({ where: { id: req.user.id } });
    const messages = await Message.findAll({ where: { read: false } });
    const notifications = filterNotifications(req.user.notification) || [];
    if (!book) {
      return res.json({ title: "not found" });
    }
    return res.render("editbook", {
      book: book,
      user: user,
      messages: messages,
      notifications: notifications,
    });
  }
);

router.get("/allbooks/reviewbook/:bookId", requireAuth, async (req, res) => {
  const { bookId } = req.params;
  const book = await Book.findOne({ where: { id: bookId } });
  const messages = await Message.findAll({ where: { read: false } });
  const notifications = filterNotifications(req.user.notification) || [];
  const comments = await Rate.findAll({
    where: { bookId: bookId, parentId: null },
  });

  const newComments = await drillName(comments);
  const updatedComments = await drillReplies(newComments);
  const ultraComments = await drillVoteCount(updatedComments);
  if (!book) {
    return res.json({ title: "not found" });
  }
  return res.render("review", {
    comments: ultraComments,
    book: book,
    user: req.user,
    messages: messages,
    notifications: notifications,
  });
});

router.post("/allbooks/reviewbook/:bookId", requireAuth, async (req, res) => {
  const { review, rating } = req.body;
  const { bookId } = req.params;
  const user = await User.findOne({ where: { id: req.user.id } });
  const book = await Book.findOne({ where: { id: bookId } });
  const hasUserTakenBook = user.dataValues.booksTaken.filter(
    (book) => book.id == bookId
  );
  console.log(hasUserTakenBook.length > 0);
  if (!(hasUserTakenBook.length > 0)) {
    console.log("not taken");
    return res.json({ title: "not taken" });
  }
  if (!bookId) {
    return res.json({ title: "not found" });
  }

  if (!review || !rating) {
    return res.json({ title: "missing values" });
  }
  const preValue = await Rate.findOne({
    where: { userId: req.user.id, bookId: bookId, parentId: null },
  });
  if (preValue) {
    return res.json({ title: "already reviewed" });
  }
  const newReview = await Rate.create({
    bookId,
    userId: req.user.id,
    value: review,
    rating: rating,
  });

  if (!newReview) {
    return res.json({ title: "create error" });
  }
  return res.json({ title: "success" });
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
  const message = `Book ${name} has been updated`;
  const users = await User.findAll();
  users.forEach(async (admin) => {
    const userNotified = await createNotification(admin, message);
    if (!userNotified) {
      return res.json({ title: "notification error" });
    }
  });
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
      newWait = [...existingWaitList, newWaitList];
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
  const newBookTaken = { id: bookId };
  const existingBooksTaken = user.dataValues.booksTaken;
  let updatedBooksTaken = [];
  if (!existingBooksTaken) {
    updatedBooksTaken = user.update({ booksTaken: [newBookTaken] });
  } else {
    updatedBooksTaken = user.update({
      booksTaken: [...existingBooksTaken, newBookTaken],
    });
  }
  if (!updatedBooksTaken) {
    return res.json({ title: "update error" });
  }
  const savedBooksTaken = await user.save();
  if (!savedBooksTaken) {
    return res.json({ title: "save error" });
  }
  const message = `You borrowed ${book.dataValues.name}`;
  const userNotified = await createNotification(user, message);
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
  const notifications = filterNotifications(req.user.notification) || [];
  return res.render("mybooks", {
    books: books,
    user: req.user,
    messages: messages,
    notifications: notifications,
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
  const message = `You returned ${book.dataValues.name}`;
  const userNotified = await createNotification(user, message);
  return res.json({ title: "success" });
});

router.get("/transactions", requireAuth, async (req, res) => {
  const isAdmin = req.user.isAdmin;
  const messages = await Message.findAll({ where: { read: false } });
  const notifications = filterNotifications(req.user.notification) || [];

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
      notifications: notifications,
    });
  }

  return res.render("usertransactions", {
    messages: messages,
    user: req.user,
    notifications: notifications,
  });
});

router.post("/transactions", requireAuth, async (req, res) => {
  const messages = await Message.findAll({ where: { read: false } });
  const user = await User.findOne({ where: { id: req.user.id } });
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
  const message = `You requested a transaction of $${transaction}`;
  const userNotified = await createNotification(user, message);
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
    const transaction = await Transaction.findOne({
      where: { id: transactionId },
    });
    const user = await User.findOne({ where: { id: transaction.userId } });
    const admin = await User.findOne({ where: { id: req.user.id } });
    let userMessage = "";
    let adminMessage = "";
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
      userMessage = `Your transaction of $${amount} has been rejected by ${admin.dataValues.fullName}`;
      adminMessage = `You rejected a transaction of $${amount} by ${user.dataValues.fullName}`;
      const userNotified = await createNotification(user, userMessage);
      const adminNotified = await createNotification(admin, adminMessage);
      return res.json({ title: "reject" });
    }
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
    userMessage = `Your transaction of $${amount} has been approved by ${admin.dataValues.fullName}`;
    adminMessage = `You approved a transaction of $${amount} by ${user.dataValues.fullName}`;
    const userNotified = await createNotification(user, userMessage);
    const adminNotified = await createNotification(admin, adminMessage);
    return res.json({ title: "success" });
  }
);

function getMatchCount(book, authors, genres, years) {
  let count = 0;
  if (authors.includes(book.author)) count++;
  if (genres.includes(book.genre)) count++;
  if (years.includes(book.publishedYear)) count++;
  return count;
}

// Function to fetch recommended books
async function fetchRecommendedBooks(authors, genres, years, borrowedBooks) {
  const borrowedBookIds = borrowedBooks.map((book) => book.id);

  // Fetch books that have at least one matching attribute and are not borrowed by the user
  const matchingBooks = await Book.findAll({
    where: {
      [Op.or]: [
        { author: { [Op.in]: authors } },
        { genre: { [Op.in]: genres } },
        { publishedYear: { [Op.in]: years } },
      ],
      id: { [Op.notIn]: borrowedBookIds },
    },
  });

  // Sort books by the number of matching properties
  const sortedMatchingBooks = matchingBooks.sort((a, b) => {
    const aMatches = getMatchCount(a, authors, genres, years);
    const bMatches = getMatchCount(b, authors, genres, years);
    return bMatches - aMatches;
  });

  // Fetch random books to add to the recommendations
  const randomBooks = await Book.findAll({
    where: {
      id: {
        [Op.notIn]: [
          ...borrowedBookIds,
          ...sortedMatchingBooks.map((book) => book.id),
        ],
      },
    },
    order: Sequelize.literal("RAND()"), // Assuming MySQL. Use Sequelize.fn('RANDOM') for PostgreSQL
    limit: 3,
  });

  // Combine sorted matching books and random books
  const recommendedBooks = [...sortedMatchingBooks, ...randomBooks];

  return recommendedBooks;
}

router.get("/recommendations", requireAuth, async (req, res) => {
  try {
    const user = await User.findOne({ where: { id: req.user.id } });
    if (!user) {
      return res.json({ title: "not found" });
    }

    const messages = await Message.findAll({ where: { read: false } });
    const notifications = filterNotifications(req.user.notification) || [];
    const userBooks = user.dataValues.bookArray || [];

    if (userBooks.length == 0) {
      const allBooks = await Book.findAll();
      const newBooks = getRandomItems(allBooks, 3);
      return res.render("recommendations", {
        user: req.user,
        messages: messages,
        notifications: notifications,
        books: newBooks,
      });
    }

    const getFullBooks = await Promise.all(
      userBooks.map(async (book) => {
        const realBook = await Book.findOne({ where: { id: book.id } });
        return realBook;
      })
    );

    const borrowedAuthors = getFullBooks.map((book) => book.dataValues.author);
    const borrowedGenres = getFullBooks.map((book) => book.dataValues.genre);
    const borrowedYears = getFullBooks.map(
      (book) => book.dataValues.publishedYear
    );

    const recommendedBooks = await fetchRecommendedBooks(
      borrowedAuthors,
      borrowedGenres,
      borrowedYears,
      userBooks
    );

    return res.render("recommendations", {
      user: req.user,
      messages: messages,
      notifications: notifications,
      books: recommendedBooks,
    });
  } catch (error) {
    console.error("Error fetching recommendations:", error);
    return res.status(500).send("Internal Server Error");
  }
});

router.get("/esewa/verify/:bookId", async (req, res) => {
  const bookId = req.params.bookId;
  const book = await Book.findOne({ where: { id: bookId } });
  const data = req.query.data;
  let decodedString = atob(data);
  const obj = await JSON.parse(decodedString);
  decodedString = await JSON.parse(decodedString);

  switch (decodedString.status) {
    case "COMPLETE":
      try {
        const payment = await Payment.create({
          bookId: bookId,
          userId: req.user.id,
          amount: decodedString.total_amount,
          paymentDate: new Date(),
          status: decodedString.status,
        });
        const user = await User.findOne({ where: { id: req.user.id } });
        const updatedUser = await user.update({
          bookArray: [
            ...user.bookArray,
            { id: bookId, fineLevied: false, returnDate: new Date() },
          ],
        });
        const updatedBook = await book.update({ stock: book.stock - 1 });

        const savedUser = await user.save();
        const savedBook = await book.save();

        res.render("esewaHandler", { message: "Payment successful" });
        break;
      } catch (error) {
        console.log(error);
      }
    case "PENDING":
      res.render("esewaHandler", { message: "Payment pending" });
      break;
    case "ERROR":
      res.redirect("esewaHandler", { message: "payment error" });
      break;
    case "FULL_REFUND":
      res.redirect("esewaHandler", { message: "full refund" });
      break;
  }
});
const crypto = require("crypto");

function generateHash(message) {
  const secret = "8gBm/:&EnhH.1/q";

  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(message);

  const hashInBase64 = hmac.digest("base64");

  return hashInBase64;
}

router.get("/esewaorder/:bookId", async (req, res) => {
  const bookId = req.params.bookId;
  // console.log(bookId);
  const transuuid = uuidv4();
  const book = await Book.findOne({ where: { id: bookId } });
  const user = await User.findOne({ where: { id: req.user.id } });
  const message = `total_amount=${
    book.price + 10
  },transaction_uuid=${transuuid},product_code=EPAYTEST`;
  const hash = generateHash(message);

  return res.render("esewaOrder", {
    book: book,
    user: req.user,
    hash: hash,
    transuuid: transuuid,
  });
});

async function drillName(list) {
  const newList = await Promise.all(
    list.map(async (item) => {
      const book = await Book.findOne({
        where: { id: item.dataValues.bookId },
      });
      item.dataValues.bookName = book.dataValues.name;
      return item;
    })
  );
  return newList;
}

router.get("/esewa/history", requireAuth, async (req, res) => {
  const user = await User.findOne({ where: { id: req.user.id } });
  const payments = await Payment.findAll({ where: { userId: req.user.id } });

  const messages = await Message.findAll({ where: { read: false } });
  const notifications = filterNotifications(req.user.notification) || [];
  const newPayments = await drillName(payments);
  newPayments.sort((a, b) => {
    const dateA = new Date(a.paymentDate);
    const dateB = new Date(b.paymentDate);
    return dateA - dateB;
  });
  console.log(newPayments);
  return res.render("esewaPayHistory", {
    user: req.user,
    messages: messages,
    notifications: notifications,
    payments: newPayments || [],
  });
});

module.exports = router;
