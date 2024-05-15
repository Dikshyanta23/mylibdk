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
    await queryInterface.createTable("transactions", {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      nature: {
        type: Sequelize.STRING,
        defaultValue: "borrow",
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "users",
          key: "id",
        },
        onDelete: "CASCADE",
      },
      book_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "books",
          key: "id",
        },
        onDelete: "CASCADE",
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      deleted_at: {
        allowNull: true,
        type: Sequelize.DATE,
      },
    });
    await queryInterface.addConstraint("transactions", {
      type: "FOREIGN KEY",
      name: "FK_user_transaction_id",
      references: {
        table: "users",
        field: "id",
      },
      fields: ["user_id"],
      onDelete: "no action",
      onUpdate: "no action",
    });
    await queryInterface.addConstraint("transactions", {
      type: "FOREIGN KEY",
      name: "FK_book_transaction_id",
      references: {
        table: "books",
        field: "id",
      },
      fields: ["book_id"],
      onDelete: "no action",
      onUpdate: "no action",
    });
  },

  async down(queryInterface, Sequelize) {
    /**
     * Add reverting commands here.
     *
     * Example:
     * await queryInterface.dropTable('users');
     */
    await queryInterface.dropTable("transactions");
    await queryInterface.removeConstraint(
      "transactions",
      "FK_user_transaction_id"
    );
    await queryInterface.removeConstraint(
      "transactions",
      "FK_book_transaction_id"
    );
  },
};
