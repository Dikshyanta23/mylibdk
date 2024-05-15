"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class Admin extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    // static associate(models) {
    //   // define association here
    //   User.hasMany(models.Meeting, {
    //     foreignKey: "user_id",
    //     as: "userMeeting",
    //   });
    //   User.hasMany(models.QuickMeeting, {
    //     foreignKey: "user_id",
    //     as: "userQuickMeeting",
    //   })
    //   User.hasMany(models.Ticket, {
    //     foreignKey: "user_id",
    //     as: "userTicket",
    //   });
    //   User.hasMany(models.MeetingBooked, {
    //     foreignKey: "user_id",
    //     as: "userMeetingBooked",
    //   });
    //   User.hasMany(models.WeeklyAvailable, {
    //     foreignKey: "user_id",
    //     as: "userWeeklyAvailable",
    //   });
    //   User.hasMany(models.SpecificAvailable, {
    //     foreignKey: "user_id",
    //     as: "userSpecificAvailable",
    //   });
    //   User.hasMany(models.Contact, {
    //     foreignKey: "user_id",
    //     as: "userContact",
    //   });
    //   User.hasOne(models.Config, {
    //     foreignKey: "user_id",
    //     as: "userConfig"
    //   })
    //   User.hasOne(models.OnlineIntegration, {
    //     foreignKey: "user_id",
    //     as: "userOnlineIntegration"
    //   }
    //   )
    // }
  }
  Admin.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      //   googleId: DataTypes.STRING,
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
    },
    {
      sequelize,
      modelName: "Admin",
      underscored: true,
    }
  );
  return Admin;
};
