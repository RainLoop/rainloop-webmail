(() => {
    const doc = document,
      visible = "visible",
      wakeUp = () => {
        clearTimeout(timer);
        if (status !== visible) {
          status = visible;
        }
        timer = setTimeout(() => {
          if (status === visible) {
            status = "idle";
            dispatchEvent(new CustomEvent("idle"));
          }
        }, 10000);
      };
    var initialized = false,
        status = visible,
        timer = false;

    function init() {
      if (initialized) {
        return true;
      }
      doc.addEventListener("visibilitychange", () => {
        status = doc.visibilityState;
        doc.hidden || wakeUp();
      }, false);
      initialized = true;
      wakeUp();
      doc.addEventListener("mousemove", wakeUp);
      doc.addEventListener("keyup", wakeUp);
      doc.addEventListener("touchstart", wakeUp);
      addEventListener("scroll", wakeUp);
    }

    window.ifvisible = {
      idle: callback => {
        init();
        addEventListener("idle", callback);
      },
      now: () => {
        init();
        return status === visible;
      }
    };
})();
