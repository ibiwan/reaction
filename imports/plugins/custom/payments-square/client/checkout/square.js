/* eslint camelcase: 0 */
/* global SqPaymentForm */
import { Meteor } from "meteor/meteor";
import { Template } from "meteor/templating";
import { AutoForm } from "meteor/aldeed:autoform";
import { $ } from "meteor/jquery";
import { Reaction } from "/client/api";
import { Cart, Shops, Packages } from "/lib/collections";
import { Square } from "../../lib/api";
import { SquarePayment } from "../../lib/collections/schemas";

import "./square.html";

let submitting = false;

function uiEnd(template, buttonText) {
  template.$(":input").removeAttr("disabled");
  template.$("#btn-complete-order").text(buttonText);
  return template.$("#btn-processing").addClass("hidden");
}

function paymentAlert(errorMessage) {
  return $(".alert").removeClass("hidden").text(errorMessage);
}

function hidePaymentAlert() {
  return $(".alert").addClass("hidden").text("");
}

function handleSquareSubmitError(error) {
  const serverError = error !== null ? error.message : void 0;
  if (serverError) {
    return paymentAlert("Oops! " + serverError);
  } else if (error) {
    return paymentAlert("Oops! " + error, null, 4);
  }
}

let paymentForm;
const applicationID = "sandbox-sq0idp-XmSJ25gtP4aeK8QWMfb4rw";
const locationID = "CBASECMIvapL2Y22Ri2VpkIw3yMgAQ";

function createPaymentForm() {
  $.getScript("https://js.squareup.com/v2/paymentform").done(function () {
    paymentForm = new SqPaymentForm({
      // Initialize the payment form elements
      applicationId: applicationID,
      locationId: locationID,
      inputClass: "form-control",

      // Customize the CSS for SqPaymentForm iframe elements
      inputStyles: [
        {
          padding: ".3em .5em",
          lineHeight: "1.75em",
          fontSize: "1em",
          boxShadow: "inset 0 1px 1px rgba(0, 0, 0, 0.075)"
        }
      ],

      // Initialize the credit card placeholders
      cardNumber: {
        elementId: "sq-card-number",
        placeholder: "4532-7597-3454-5858"
      },
      cvv: {
        elementId: "sq-cvv",
        placeholder: "CVV"
      },
      expirationDate: {
        elementId: "sq-expiration-date",
        placeholder: "MM/YY"
      },
      postalCode: {
        elementId: "sq-postal-code"
      },

      // SqPaymentForm callback functions
      callbacks: {
        /*
           * callback function: methodsSupported
           * Triggered when: the page is loaded.
           */
        methodsSupported: function(methods) {
          const applePayBtn = document.getElementById("sq-apple-pay");
          const applePayLabel = document.getElementById(
            "sq-apple-pay-label"
          );
          const masterpassBtn = document.getElementById("sq-masterpass");
          const masterpassLabel = document.getElementById(
            "sq-masterpass-label"
          );

          // Only show the button if Apple Pay for Web is enabled
          // Otherwise, display the wallet not enabled message.
          if (methods.applePay === true) {
            applePayBtn.style.display = "inline-block";
            applePayLabel.style.display = "none";
          }
          // Only show the button if Masterpass is enabled
          // Otherwise, display the wallet not enabled message.
          if (methods.masterpass === true) {
            masterpassBtn.style.display = "inline-block";
            masterpassLabel.style.display = "none";
          }
        },

        /*
           * callback function: createPaymentRequest
           * Triggered when: a digital wallet payment button is clicked.
           */
        createPaymentRequest: function() {
          let paymentRequestJson;
          /* ADD CODE TO SET/CREATE paymentRequestJson */
          return paymentRequestJson;
        },

        /*
           * callback function: cardNonceResponseReceived
           * Triggered when: SqPaymentForm completes a card nonce request
           */
        cardNonceResponseReceived: function(errors, nonce, cardData) {
          if (errors) {
            // Log errors from nonce generation to the Javascript console
            console.log("Encountered errors:");
            errors.forEach(function(error) {
              console.log("  " + error.message);
            });
            return;
          }
          console.log(cardData);
          console.log("nonce: %s", nonce);
          // Assign the nonce value to the hidden form field
          $("#card-nonce").val(nonce);
          $("#square-payment-form").submit();
        },

        /*
           * callback function: unsupportedBrowserDetected
           * Triggered when: the page loads and an unsupported browser is detected
           */
        unsupportedBrowserDetected: function() {
          /* PROVIDE FEEDBACK TO SITE VISITORS */
        },

        /*
           * callback function: inputEventReceived
           * Triggered when: visitors interact with SqPaymentForm iframe elements.
           */
        inputEventReceived: function(inputEvent) {
          switch (inputEvent.eventType) {
            case "focusClassAdded":
              /* HANDLE AS DESIRED */
              break;
            case "focusClassRemoved":
              /* HANDLE AS DESIRED */
              break;
            case "errorClassAdded":
              /* HANDLE AS DESIRED */
              break;
            case "errorClassRemoved":
              /* HANDLE AS DESIRED */
              break;
            case "cardBrandChanged":
              /* HANDLE AS DESIRED */
              break;
            case "postalCodeChanged":
              /* HANDLE AS DESIRED */
              break;
            default:
              break;
          }
        },

        /*
           * callback function: paymentFormLoaded
           * Triggered when: SqPaymentForm is fully loaded
           */
        paymentFormLoaded: function() {
          /* HANDLE AS DESIRED */
          let currentCart = Cart.findOne();
          paymentForm.setPostalCode(currentCart.billing[0].address.postal);
        }
      }
    });
    paymentForm.build();
  });
}

Template.squarePaymentForm.onRendered(function () {
  $(document).ready(function () {
    createPaymentForm();
  });
  $("#submitCard").on("click", function () {
    paymentForm.requestCardNonce();
  });
});

Template.squarePaymentForm.helpers({
  SquarePayment() {
    return SquarePayment;
  }
});

AutoForm.debug();

AutoForm.addHooks("square-payment-form", {
  onSubmit: function (doc) {
    submitting = true;
    const template = this.template;
    hidePaymentAlert();
    const form = {
      cardNonce: doc.nonce
    };
    Meteor.subscribe("Packages", Reaction.getShopId());
    const packageData = Packages.findOne({
      name: "square-paymentmethod",
      shopId: Reaction.getShopId()
    });
    Square.authorize(
      form,
      {
        total: Cart.findOne().getTotal(),
        currency: Shops.findOne().currency
      },
      function (error, transaction) {
        submitting = false;
        let paymentMethod;
        if (error) {
          handleSquareSubmitError(error);
          uiEnd(template, "Resubmit payment");
        } else {
          if (transaction.saved === true) {
            submitting = false;
            paymentMethod = {
              processor: "Square",
              paymentPackageId: packageData._id,
              paymentSettingsKey: packageData.registry[0].settingsKey,
              storedCard: form.nonce,
              method: "credit",
              transactionId: transaction.transactionId,
              riskLevel: transaction.riskLevel,
              currency: transaction.currency,
              amount: transaction.amount,
              status: transaction.status,
              mode: "authorize",
              createdAt: new Date(),
              transactions: []
            };
            paymentMethod.transactions.push(transaction.response);
            Meteor.call("cart/submitPayment", paymentMethod);
          } else {
            handleSquareSubmitError(transaction.error);
            uiEnd(template, "Resubmit payment");
          }
        }
      }
    );
    return false;
  },
  beginSubmit: function () {
    this.template.$(":input").attr("disabled", true);
    this.template.$("#btn-complete-order").text("Submitting ");
    return this.template.$("#btn-processing").removeClass("hidden");
  },
  endSubmit: function () {
    if (!submitting) {
      return uiEnd(this.template, "Complete your order");
    }
  },
  onSuccess: function () {
    paymentForm.destroy();
  }
});
