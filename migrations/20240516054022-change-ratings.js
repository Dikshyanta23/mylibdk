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
    await queryInterface.removeColumn("rates", "replies");
    await queryInterface.addColumn("rates", "parent_id", {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: "rates",
        key: "id",
      },
      onDelete: "CASCADE",
    });
  },

  async down(queryInterface, Sequelize) {
    /**
     * Add reverting commands here.
     *
     * Example:
     * await queryInterface.dropTable('users');
     */
    await queryInterface.addColumn("rates", "replies", {
      type: Sequelize.JSON,
    });
    await queryInterface.removeColumn("rates", "parent_id");
  },
};
