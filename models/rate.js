"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Rate extends Model {
    static associate(models) {
      // define association here
      Rate.belongsTo(models.User, {
        foreignKey: "user_id",
        as: "rateUser",
      });
      Rate.belongsTo(models.Book, {
        foreignKey: "book_id",
        as: "rateBook",
      });
    }
  }
  Rate.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      rating: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
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
      bookId: {
        type: DataTypes.UUID,
        allowNull: false,
        // references: {
        //   model: "User",
        //   key: "id",
        // },
        // onDelete: "CASCADE",
      },
      value: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "Hello",
      },
      parentId: {
        type: DataTypes.UUID,
      },
      votes: {
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: [],
      },
    },

    {
      sequelize,
      modelName: "Rate",
      underscored: true,
      paranoid: true,
    }
  );

  return Rate;
};
