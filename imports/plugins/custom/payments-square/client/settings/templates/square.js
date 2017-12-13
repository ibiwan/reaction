import { SquareSettingsFormContainer } from "../containers";
import { Template } from "meteor/templating";
import "./square.html";

Template.squareSettings.helpers({
  SquareSettings() {
    return {
      component: SquareSettingsFormContainer
    };
  }
});
