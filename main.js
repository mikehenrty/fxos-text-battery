(function() {
  var APP_NAME = 'Battery Percentage';

  function TextBatteryLevel(addon) {
    this.trailCount = 5;
    // this part should be moved to css file, but the CSS injection feature is
    // broken now.
    this.style = document.createElement('style');
    this.style.id = 'text-battery-style';

    // Remove any previous installs of the battery styling.
    var previousStyle = document.getElementById(this.style.id);
    if (previousStyle) {
      previousStyle.remove();
    }
    this.style.textContent = `
      .sb-icon-battery[data-battery-level]:after {
        content: attr(data-battery-level);
        text-align: center;
        position: absolute;
        width: 2.5rem;
        height: 1.6rem;
        line-height: 1.6rem;
        color: red;
        text-shadow: none;
        font-weight: bold;
        text-shadow:
          0 0 0.2rem white,
          0 0 0.1rem white,
          0 0 0.05rem white,
          0 0 0.025rem white,
          0 0 0.01rem white,
          0 0 0 white;
      }

      #statusbar .sb-icon-battery[data-battery-level][data-charging="true"]:after {
        content: "+"attr(data-battery-level);
      }`;
    this.inited = false;
  }

  TextBatteryLevel.prototype.init = function() {
    if (this.inited) {
      // We don't know the state of first installation. It should be 'uninited',
      // but it isn't always.
      // To prevent multiple initialization, I use this variable to pretect it.
      return;
    }

    this.battery = window.navigator.battery;
    if (!this.battery) {
      return;
    }

    if (!this.checkBatteryIcon()) {
      if (this.trailCount > 0) {
        setTimeout(this.init.bind(this), 2000);
        this.trailCount--;
      }
      return;
    }

    document.body.appendChild(this.style);
    this.battery.addEventListener('levelchange', this);
    this.updateDataset(this.battery.level);
    this.inited = true;
  };

  TextBatteryLevel.prototype.checkBatteryIcon = function() {
    return document.querySelectorAll('.sb-icon-battery').length > 0;
  };

  TextBatteryLevel.prototype.uninit = function() {
    if (!this.battery) {
      return;
    }
    var previousStyle = document.getElementById(this.style.id);
    if (previousStyle) {
      previousStyle.remove();
    }
    this.battery.removeEventListener('levelchange', this);
    this.updateDataset(null);
    document.body.removeChild(this.style);
    this.inited = false;
  };

  TextBatteryLevel.prototype.updateDataset = function(level) {
    var batteryIcons = document.querySelectorAll('.sb-icon-battery');
    [].forEach.call(batteryIcons, function(dom) {
      if (!level) {
        dom.removeAttribute('data-battery-level');
      } else {
        dom.dataset.batteryLevel = Math.round(level * 100);
      }
    });
  };

  TextBatteryLevel.prototype.handleEvent = function(e) {
    switch(e.type) {
      case 'levelchange':
        this.updateDataset(this.battery.level);
        break;
    }
  };

  function TextBatteryLevelMgmt() {
    if (document.documentElement.dataset.textBatteryLevel) {
      console.log('text-battery-level is already injected');
      return;
    }

    this.batteryIcon = new TextBatteryLevel();
    this.batteryIcon.init();

    navigator.mozApps.mgmt.addEventListener('enabledstatechange', this);
    navigator.mozApps.mgmt.addEventListener('uninstall', this);

    document.documentElement.dataset.textBatteryLevel = true;
  }

  TextBatteryLevelMgmt.prototype.handleEvent = function(e) {
    if (e.application.name !== APP_NAME) {
      return;
    }

    switch(e.type) {
      case 'enabledstatechange':
        if (e.application.enabled) {
          this.batteryIcon.init();
        } else {
          this.batteryIcon.uninit();
        }
        break;
      case 'uninstall':
        this.batteryIcon.uninit();
        navigator.mozApps.mgmt.removeEventListener('enabledstatechange', this);
        navigator.mozApps.mgmt.removeEventListener('uninstall', this);
        document.documentElement.removeAttribute('data-text-battery-level');
        break;
    }
  };

  if (document.readyState !== 'loading') {
    new TextBatteryLevelMgmt();
  } else {
    document.addEventListener('readystatechange',
      function readyStateChange() {
        if (document.readyState === 'interactive') {
          document.removeEventListener('readystatechange',
            readyStateChange);
          new TextBatteryLevelMgmt();
        }
      });
  }
})();
