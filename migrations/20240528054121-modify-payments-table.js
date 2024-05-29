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
    await queryInterface.removeColumn("payments", "data_verification");
    await queryInterface.removeColumn("payments", "pidx");
    await queryInterface.removeColumn("payments", "api_query");
    await queryInterface.removeColumn("payments", "payment_gateway");
  },

  async down(queryInterface, Sequelize) {
    /**
     * Add reverting commands here.
     *
     * Example:
     * await queryInterface.dropTable('users');
     */
    await queryInterface.addColumn("payments", "data_verification", {
      type: Sequelize.STRING,
    });
    await queryInterface.addColumn("payments", "pidx", {
      type: Sequelize.STRING,
    });
    await queryInterface.addColumn("payments", "api_query", {
      type: Sequelize.STRING,
    });
    await queryInterface.addColumn("payments", "payment_gateway", {
      type: Sequelize.STRING,
    });
  },
};
