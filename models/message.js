"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Message extends Model {
    static associate(models) {
      // define association here
    }
  }
  Message.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      name: DataTypes.STRING,
      email: DataTypes.STRING,
      adressone: {
        type: DataTypes.STRING,
        defaultValue: "shreetole",
        allowNull: false,
      },
      city: {
        type: DataTypes.STRING,
        defaultValue: "kathmandu",
        allowNull: false,
      },
      message: DataTypes.STRING,
      read: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
    },

    {
      sequelize,
      modelName: "Message",
      underscored: true,
      paranoid: true,
    }
  );

  return Message;
};
