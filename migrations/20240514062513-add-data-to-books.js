"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    /**
     * Add altering commands here.
     *
     * Example:
     * await queryInterface.createTable('users', { id: Sequelize.INTEGER });
     */
    await queryInterface.addColumn("books", "published_year", {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: "2010",
    });
    await queryInterface.addColumn("books", "genre", {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: "fiction",
    });
    await queryInterface.addColumn("books", "author", {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: "scott",
    });
  },

  async down(queryInterface, Sequelize) {
    /**
     * Add reverting commands here.
     *
     * Example:
     * await queryInterface.dropTable('users');
     */
    await queryInterface.removeColumn("books", "author");
    await queryInterface.removeColumn("books", "published_year");
    await queryInterface.removeColumn("books", "genre");
  },
};
