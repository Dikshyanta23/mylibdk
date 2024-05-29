"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Payment extends Model {
    static associate(models) {
      // define association here
      Payment.belongsTo(models.User, {
        foreignKey: "user_id",
        as: "paymentUser",
      });

      Payment.belongsTo(models.Book, {
        foreignKey: "book_id",
        as: "paymentBook",
      });
    }
  }
  Payment.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      bookId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      amount: DataTypes.INTEGER,
      status: {
        type: DataTypes.STRING,
        defaultValue: "pending",
      },
      paymentDate: {
        type: DataTypes.DATE,
        defaultValue: new Date(),
      },
    },

    {
      sequelize,
      modelName: "Payment",
      underscored: true,
      paranoid: true,
    }
  );

  return Payment;
};
