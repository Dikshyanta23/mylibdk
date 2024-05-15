"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Book extends Model {
    static associate(models) {
      // define association here
      Book.belongsTo(models.User, {
        foreignKey: "user_id",
        as: "bookUser",
      });
      Book.hasMany(models.Transaction, {
        foreignKey: "id",
        as: "transactionsMade",
      });
    }
  }
  Book.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      name: DataTypes.STRING,
      price: DataTypes.INTEGER,
      stock: DataTypes.INTEGER,
      fine: DataTypes.INTEGER,
      photo: {
        type: DataTypes.STRING,
        defaultValue: process.env.URL + "/default.png",
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
        // references: {
        //   model: "User",
        //   key: "id",
        // },
        // onDelete: "CASCADE",
      },
      author: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "anonymous",
      },
      publishedYear: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "2010",
      },
      genre: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "fiction",
      },
    },

    {
      sequelize,
      modelName: "Book",
      underscored: true,
      paranoid: true,
    }
  );

  return Book;
};
