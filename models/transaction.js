"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Transaction extends Model {
    static associate(models) {
      // define association here
      Transaction.belongsTo(models.User, {
        foreignKey: "user_id",
        as: "transactionUser",
      });
    }
  }
  Transaction.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      nature: DataTypes.STRING,
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
        // references: {
        //   model: "User",
        //   key: "id",
        // },
        // onDelete: "CASCADE",
      },
      amount: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
    },

    {
      sequelize,
      modelName: "Transaction",
      underscored: true,
      paranoid: true,
    }
  );

  return Transaction;
};
