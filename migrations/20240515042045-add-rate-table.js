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
    await queryInterface.createTable("rates", {
      id: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
      },
      is_review: {
        allowNull: false,
        type: Sequelize.BOOLEAN,
        defaultValue: false,
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
          model: "users",
          key: "id",
        },
        onDelete: "CASCADE",
      },
      value: {
        allowNull: false,
        type: Sequelize.STRING,
        defaultValue: "hello",
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
    await queryInterface.addConstraint("rates", {
      type: "FOREIGN KEY",
      name: "FK_users_rate_id",
      references: {
        table: "users",
        field: "id",
      },
      fields: ["user_id"],
      onDelete: "no action",
      onUpdate: "no action",
    });
    // await queryInterface.addConstraint("rates", {
    //   type: "FOREIGN KEY",
    //   name: "FK_books_rate_id",
    //   references: {
    //     table: "books",
    //     field: "id",
    //   },
    //   fields: ["book_id"],
    //   onDelete: "no action",
    //   onUpdate: "no action",
    // });
  },

  async down(queryInterface, Sequelize) {
    /**
     * Add reverting commands here.
     *
     * Example:
     * await queryInterface.dropTable('users');
     */
    await queryInterface.dropTable("rates");
    await queryInterface.removeConstraint("rates", "FK_users_rate_id");
    // await queryInterface.removeConstraint("rates", "FK_books_rate_id");
  },
};
