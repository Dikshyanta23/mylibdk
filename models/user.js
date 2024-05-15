"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    static associate(models) {
      User.hasMany(models.Book, {
        foreignKey: "id",
        as: "booksTaken",
      });
      User.hasMany(models.Transaction, {
        foreignKey: "id",
        as: "TransactionsMade",
      });
      User.hasMany(models.Rate, {
        foreignKey: "id",
        as: "UserRates",
      });
    }
  }
  User.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      fullName: DataTypes.STRING,
      email: {
        type: DataTypes.STRING,
        unique: true,
      },
      password: DataTypes.STRING,
      phone: DataTypes.STRING,
      photo: {
        type: DataTypes.STRING,
        defaultValue: process.env.URL + "/img/default.png",
      },
      code: DataTypes.STRING,
      suspended: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      countryName: {
        type: DataTypes.STRING,
      },
      isAdmin: {
        type: DataTypes.BOOLEAN,
      },
      isVerified: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      bookArray: {
        type: DataTypes.JSON,
      },
      balance: {
        type: DataTypes.INTEGER,
      },
      waitlist: {
        type: DataTypes.JSON,
      },
    },

    {
      sequelize,
      modelName: "User",
      underscored: true,
      paranoid: true,
    }
  );

  return User;
};
