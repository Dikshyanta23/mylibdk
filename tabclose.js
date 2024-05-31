$(window).on("beforeunload", function () {
  // Send a request to the server when the tab is closed or navigated away from
  console.log("Tab is closing or navigating away.");
  $.ajax({
    url: "/logout",
    type: "POST",
    contentType: "application/json",
    data: JSON.stringify({
      /* Any data you want to send to the server */
    }),
    success: function () {
      console.log("yay");
    },
  });
});
