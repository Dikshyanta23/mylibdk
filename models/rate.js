"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Rate extends Model {
    static associate(models) {
      // define association here
      Rate.belongsTo(models.User, {
        foreignKey: "user_id",
        as: "RateUser",
      });
      Rate.belongsTo(models.Book, {
        foreignKey: "book_id",
        as: "RateBook",
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
      isReview: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        allowNull: false,
      },

      userId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      bookId: {
        type: DataTypes.UUID,
        allowNull: false,
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
