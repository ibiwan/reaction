import { SimpleSchema } from "meteor/aldeed:simple-schema";
import { PackageConfig } from "/lib/collections/schemas/registry";
import { registerSchema } from "@reactioncommerce/reaction-collections";

export const SquarePackageConfig = new SimpleSchema([
  PackageConfig, {
    "settings.mode": {
      type: Boolean,
      defaultValue: true
    },
    "settings.apiKey": {
      type: String,
      label: "Access Token",
      optional: false
    },
    "settings.applicationID": {
      type: String,
      label: "Application ID",
      optional: false
    },
    "settings.locationID": {
      type: String,
      label: "Location ID",
      optional: false
    }
  }
]);

registerSchema("SquarePackageConfig", SquarePackageConfig);

export const SquarePayment = new SimpleSchema({
  nonce: {
    type: String,
    label: "nonce"
  }
});

registerSchema("SquarePayment", SquarePayment);
