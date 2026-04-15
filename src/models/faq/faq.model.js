// const { Model, DataTypes } = require("sequelize");
// const sequelize = require("../../config/db");

// class FAQ extends Model {}

// FAQ.init(
//   {
//     id: {
//       type: DataTypes.INTEGER,
//       primaryKey: true,
//       autoIncrement: true,
//     },
//     question: {
//       type: DataTypes.TEXT,
//       allowNull: false,
//       validate: {
//         notEmpty: {
//           msg: "Question cannot be empty"
//         }
//       }
//     },
//     answer: {
//       type: DataTypes.TEXT,
//       allowNull: false,
//       validate: {
//         notEmpty: {
//           msg: "Answer cannot be empty"
//         }
//       }
//     },
//     category: {
//       type: DataTypes.STRING(100),
//       allowNull: true,
//       defaultValue: "General",
//     },
//     order: {
//       type: DataTypes.INTEGER,
//       defaultValue: 0,
//       comment: "Display order for FAQs",
//     },
//     isActive: {
//       type: DataTypes.BOOLEAN,
//       defaultValue: true,
//     },
//     isPublished: {
//       type: DataTypes.BOOLEAN,
//       defaultValue: true,
//     },
//     views: {
//       type: DataTypes.INTEGER,
//       defaultValue: 0,
//       comment: "Number of times this FAQ has been viewed",
//     },
//     helpfulCount: {
//       type: DataTypes.INTEGER,
//       defaultValue: 0,
//       comment: "Number of users who found this helpful",
//     },
//     notHelpfulCount: {
//       type: DataTypes.INTEGER,
//       defaultValue: 0,
//       comment: "Number of users who found this not helpful",
//     },
//     createdBy: {
//       type: DataTypes.INTEGER,
//       allowNull: true,
//       comment: "Admin user ID who created this FAQ",
//     },
//     updatedBy: {
//       type: DataTypes.INTEGER,
//       allowNull: true,
//       comment: "Admin user ID who last updated this FAQ",
//     },
//   },
//   {
//     sequelize,
//     modelName: "FAQ",
//     tableName: "faqs",
//     timestamps: true,
//     paranoid: true, // Enables soft delete (deletedAt column)
//     indexes: [
//       {
//         fields: ["category"],
//       },
//       {
//         fields: ["isActive"],
//       },
//       {
//         fields: ["order"],
//       },
//     ],
//   }
// );

// module.exports = FAQ;





const { Model, DataTypes } = require("sequelize");
const sequelize = require("../../config/db");

class FAQ extends Model {}

FAQ.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },

    question: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: {
          msg: "Question cannot be empty",
        },
      },
    },

    answer: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: {
          msg: "Answer cannot be empty",
        },
      },
    },
  },
  {
    sequelize,               // 🔥 THIS WAS MISSING
    modelName: "FAQ",
    tableName: "faqs",
    timestamps: true,
    paranoid: true,
  }
);

module.exports = FAQ;