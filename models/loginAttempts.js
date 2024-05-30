"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class LoginAttempts extends Model {
    static associate(models) {
      // define association here
    }
  }
  LoginAttempts.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      email: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      tries: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      ipAddress: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      triggerDate: {
        type: DataTypes.BIGINT,
        allowNull: false,
      },
    },

    {
      sequelize,
      modelName: "LoginAttempts",
      underscored: true,
      paranoid: true,
    }
  );

  return LoginAttempts;
};
