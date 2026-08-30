class FchPlantMonitorCard extends HTMLElement {
  static getStubConfig() {
    return { entity: "plant.my_plant" };
  }

  setConfig(config) {
    if (!config?.entity) {
      throw new Error("The 'entity' option is required for fch-plant-monitor-card.");
    }

    this._config = {
      display_type: "full",
      show_bars: ["moisture", "temperature", "conductivity", "brightness"],
      ...config,
    };
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    this._render();
  }

  getCardSize() {
    return this._config?.display_type === "compact" ? 3 : 5;
  }

  _render() {
    if (!this._config || !this._hass) return;

    const plant = this._hass.states[this._config.entity];
    if (!plant) {
      this.innerHTML = `<ha-card><div class="error">Entity not found: ${this._escape(this._config.entity)}</div></ha-card>`;
      return;
    }

    const attributes = plant.attributes || {};
    const sensors = attributes.sensors || {};
    const compact = this._config.display_type === "compact";
    const name = this._config.name || attributes.friendly_name || plant.entity_id;
    const status = plant.state === "ok" ? "ok" : plant.state === "problem" ? "problem" : "unknown";
    const image = this._config.hide_image ? "" : this._config.image || attributes.entity_picture;
    const showUnits = this._config.hide_units !== undefined ? !this._config.hide_units : !compact;
    const columns = this._config.bars_per_row || (compact ? 1 : 2);
    const bars = (this._config.show_bars || []).map((type) =>
      this._renderBar(type, sensors[type], attributes[`min_${type}`], attributes[`max_${type}`], showUnits)
    ).filter(Boolean).join("");
    const battery = this._renderBattery(sensors.battery);

    this.innerHTML = `
      <style>
        :host { display: block; }
        ha-card { overflow: hidden; background: var(--ha-card-background, var(--card-background-color)); }
        .error { padding: 16px; color: var(--error-color); }
        .header { display: flex; align-items: center; gap: 14px; padding: 18px 18px 14px; cursor: pointer; }
        .header:focus-visible { outline: 2px solid var(--primary-color); outline-offset: -2px; }
        .image, .image-placeholder { width: ${compact ? "56px" : "72px"}; height: ${compact ? "56px" : "72px"}; border-radius: 50%; flex: 0 0 auto; }
        .image { object-fit: cover; background: var(--secondary-background-color); box-shadow: 0 2px 8px rgba(0, 0, 0, .2); }
        .image-placeholder { display: grid; place-items: center; background: var(--secondary-background-color); color: var(--primary-color); }
        .image-placeholder ha-icon { --mdc-icon-size: ${compact ? "28px" : "34px"}; }
        .title { min-width: 0; flex: 1; }
        .name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: ${compact ? "1em" : "1.2em"}; font-weight: 500; letter-spacing: .01em; }
        .entity { color: var(--secondary-text-color); font-size: .8em; margin-top: 3px; }
        .status { display: inline-flex; align-items: center; gap: 4px; margin-top: 8px; padding: 3px 7px; border-radius: 999px; font-size: .7em; font-weight: 600; letter-spacing: .04em; text-transform: uppercase; background: var(--secondary-background-color); }
        .status ha-icon { --mdc-icon-size: 14px; }
        .status.ok { color: var(--success-color, #43a047); }
        .status.problem { color: var(--error-color, #db4437); }
        .status.unknown { color: var(--secondary-text-color); }
        .battery { color: var(--secondary-text-color); display: flex; align-items: center; gap: 2px; align-self: flex-start; font-size: .75em; }
        .battery ha-icon { --mdc-icon-size: 23px; }
        .battery.good { color: var(--success-color, #43a047); }
        .battery.warning { color: var(--warning-color, #f9a825); }
        .battery.low { color: var(--error-color, #db4437); }
        .measurements { display: grid; grid-template-columns: repeat(${columns === 1 ? 1 : 2}, minmax(0, 1fr)); gap: 12px 16px; padding: 2px 18px 18px; }
        .measurement { min-width: 0; }
        .reading { display: grid; grid-template-columns: 20px minmax(0, 1fr) auto; align-items: center; column-gap: 6px; margin-bottom: 7px; font-size: .82em; }
        .reading ha-icon { --mdc-icon-size: 18px; color: var(--secondary-text-color); }
        .label { color: var(--secondary-text-color); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .value { font-weight: 500; white-space: nowrap; }
        .value.problem { color: var(--error-color, #db4437); }
        .bar { position: relative; height: 8px; border-radius: 999px; background: linear-gradient(to right, var(--error-color, #db4437) 0 var(--lower), var(--success-color, #43a047) var(--lower) var(--upper), var(--error-color, #db4437) var(--upper) 100%); }
        .bar::before, .bar::after { position: absolute; top: -2px; z-index: 1; width: 2px; height: 12px; border-radius: 2px; background: var(--primary-text-color); content: ""; opacity: .45; }
        .bar::before { left: var(--lower); transform: translateX(-1px); }
        .bar::after { left: var(--upper); transform: translateX(-1px); }
        .marker { position: absolute; z-index: 2; top: -3px; left: calc(var(--position) - 7px); width: 14px; height: 14px; box-sizing: border-box; border: 3px solid var(--card-background-color, white); border-radius: 50%; background: var(--marker-color); box-shadow: 0 1px 4px rgba(0, 0, 0, .35); }
        .range { min-height: 14px; margin-top: 5px; color: var(--secondary-text-color); font-size: .68em; }
        @media (max-width: 360px) { .measurements { grid-template-columns: 1fr; } }
      </style>
      <ha-card>
        <div class="header" role="button" tabindex="0" aria-label="Show ${this._escape(name)} details">
          ${image ? `<img class="image" src="${this._escape(image)}" alt="" />` : '<div class="image-placeholder"><ha-icon icon="mdi:leaf"></ha-icon></div>'}
          <div class="title">
            <div class="name">${this._escape(name)}</div>
            <div class="entity">${this._escape(this._config.entity)}</div>
            ${this._renderStatus(status)}
          </div>
          ${battery}
        </div>
        ${bars ? `<div class="measurements">${bars}</div>` : '<div class="error">No supported plant sensors are configured.</div>'}
      </ha-card>`;

    this.querySelector(".header")?.addEventListener("click", () => this._showMoreInfo());
    this.querySelector(".header")?.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") this._showMoreInfo();
    });
  }

  _renderStatus(status) {
    const details = {
      ok: ["mdi:check-circle", "Healthy"],
      problem: ["mdi:alert-circle", "Needs attention"],
      unknown: ["mdi:help-circle", "Unknown"],
    }[status];
    return `<div class="status ${status}"><ha-icon icon="${details[0]}"></ha-icon>${details[1]}</div>`;
  }

  _renderBar(type, entityId, min, max, showUnits) {
    if (!entityId) return "";

    const sensor = this._hass.states[entityId];
    const value = Number(sensor?.state);
    if (!sensor || !Number.isFinite(value)) return "";

    const details = {
      moisture: ["Moisture", "mdi:water-percent"],
      temperature: ["Temperature", "mdi:thermometer"],
      conductivity: ["Conductivity", "mdi:lightning-bolt"],
      brightness: ["Light", "mdi:white-balance-sunny"],
    }[type];
    if (!details) return "";
    const hasMin = Number.isFinite(Number(min));
    const hasMax = Number.isFinite(Number(max));
    const minimum = hasMin ? Number(min) : undefined;
    const maximum = hasMax ? Number(max) : undefined;
    const healthy = (!hasMin || value >= minimum) && (!hasMax || value <= maximum);
    const lowerBound = hasMin ? Math.min(0, minimum * 0.6) : 0;
    const upperBound = hasMax ? maximum * 1.4 : Math.max(value * 1.25, (minimum || 0) * 1.5, 1);
    const span = Math.max(upperBound - lowerBound, 1);
    const position = this._clamp(((value - lowerBound) / span) * 100);
    const lower = hasMin ? this._clamp(((minimum - lowerBound) / span) * 100) : 0;
    const upper = hasMax ? this._clamp(((maximum - lowerBound) / span) * 100) : 100;
    const unit = showUnits ? sensor.attributes.unit_of_measurement || "" : "";
    const range = [hasMin ? `min ${this._format(minimum)}` : "", hasMax ? `max ${this._format(maximum)}` : ""].filter(Boolean).join(" – ");

    return `<div class="measurement">
      <div class="reading"><ha-icon icon="${details[1]}"></ha-icon><span class="label">${details[0]}</span><span class="value ${healthy ? "" : "problem"}">${this._escape(this._format(value))}${unit ? ` ${this._escape(unit)}` : ""}</span></div>
      <div class="bar" style="--position: ${position}%; --lower: ${lower}%; --upper: ${upper}%; --marker-color: ${healthy ? "var(--success-color, #43a047)" : "var(--error-color, #db4437)"};"><span class="marker"></span></div>
      <div class="range">${this._escape(range)}${range && unit ? ` ${this._escape(unit)}` : ""}</div>
    </div>`;
  }

  _renderBattery(entityId) {
    if (!entityId) return "";

    const battery = this._hass.states[entityId];
    const value = Number(battery?.state);
    if (!Number.isFinite(value)) return "";

    const level = value >= 40 ? "good" : value >= 20 ? "warning" : "low";
    const icon = value >= 95 ? "mdi:battery" : value < 10 ? "mdi:battery-outline" : `mdi:battery-${Math.floor(value / 10) * 10}`;
    return `<div class="battery ${level}" title="Battery: ${this._escape(this._format(value))}%"><ha-icon icon="${icon}"></ha-icon><span>${this._escape(this._format(value))}%</span></div>`;
  }

  _showMoreInfo() {
    this.dispatchEvent(new CustomEvent("hass-more-info", { detail: { entityId: this._config.entity }, bubbles: true, composed: true }));
  }

  _clamp(value) {
    return Math.min(100, Math.max(0, value));
  }

  _format(value) {
    return Number.isInteger(value) ? String(value) : value.toFixed(1);
  }

  _escape(value) {
    return String(value).replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]);
  }
}

customElements.define("fch-plant-monitor-card", FchPlantMonitorCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "fch-plant-monitor-card",
  name: "FCH Plant Monitor Card",
  description: "Displays a Home Assistant built-in plant monitor entity.",
});
