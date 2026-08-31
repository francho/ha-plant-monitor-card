class FchPlantMonitorCard extends HTMLElement {
  static getStubConfig() {
    return { entity: "plant.my_plant" };
  }

  setConfig(config) {
    if (!config?.entity) {
      throw new Error("The 'entity' option is required for fch-plant-monitor-card.");
    }

    this._config = { ...config };
    this._render(true);
  }

  set hass(hass) {
    this._hass = hass;
    this._render();
  }

  getCardSize() {
    return 5;
  }

  _render(force = false) {
    if (!this._config || !this._hass) return;
    if (!force && !this._hasRelevantStateChanged()) return;

    const plant = this._hass.states[this._config.entity];
    if (!plant) {
      this.innerHTML = `<ha-card><div class="error">Entity not found: ${this._escape(this._config.entity)}</div></ha-card>`;
      this._rememberRenderedStates();
      return;
    }

    const attributes = plant.attributes || {};
    const sensors = attributes.sensors || {};
    const name = (this._config.name || attributes.friendly_name || plant.entity_id).replace(/_/g, " ");
    const status = plant.state === "ok" ? "ok" : plant.state === "problem" ? "problem" : "unknown";
    const image = this._config.image || attributes.entity_picture;
    const moisture = this._renderBar(
      sensors.moisture,
      this._config.min_moisture,
      this._config.max_moisture
    );
    const readings = ["temperature", "conductivity", "brightness"]
      .map((type) => this._renderValue(type, sensors[type]))
      .filter(Boolean)
      .join("");
    const battery = this._renderBattery(sensors.battery);

    this.innerHTML = `
      <style>
        :host { display: block; }
        ha-card { overflow: hidden; background: var(--ha-card-background, var(--card-background-color)); }
        .error { padding: 16px; color: var(--error-color); }
        .header { display: flex; align-items: center; gap: 14px; padding: 18px 18px 14px; }
        .image, .image-placeholder { width: 56px; height: 56px; border-radius: 50%; flex: 0 0 auto; }
        .image { object-fit: cover; background: var(--secondary-background-color); box-shadow: 0 2px 8px rgba(0, 0, 0, .2); }
        .image-placeholder { display: grid; place-items: center; background: var(--secondary-background-color); color: var(--primary-color); }
        .image-placeholder ha-icon { --mdc-icon-size: 34px; }
        .title { min-width: 0; flex: 1; }
        .name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 1.2em; font-weight: 500; letter-spacing: .01em; }
        .entity { color: var(--secondary-text-color); font-size: .8em; margin-top: 3px; }
        .statuses { display: flex; flex-wrap: wrap; gap: 6px; }
        .status { display: inline-flex; align-items: center; gap: 4px; padding: 3px 7px; border-radius: 999px; font-size: .7em; font-weight: 600; letter-spacing: .04em; text-transform: uppercase; background: var(--secondary-background-color); }
        .status ha-icon { --mdc-icon-size: 14px; }
        .status.problem { color: var(--error-color, #db4437); }
        .battery { color: var(--secondary-text-color); display: flex; align-items: center; gap: 2px; align-self: flex-start; font-size: .75em; flex-direction: column; }
        .battery ha-icon { --mdc-icon-size: 23px; }
        .battery.good { color: var(--success-color, #43a047); }
        .battery.warning { color: var(--warning-color, #f9a825); }
        .battery.low { color: var(--error-color, #db4437); }
        .measurements { padding: 2px 18px 4px;}
        .measurement { min-width: 0; }
        .reading { display: grid; grid-template-columns: 20px minmax(0, 1fr) auto; align-items: center; column-gap: 6px; margin-bottom: 7px; font-size: .82em; }
        .reading ha-icon { --mdc-icon-size: 18px; color: var(--secondary-text-color); }
        .label { color: var(--secondary-text-color); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .value { font-weight: 500; white-space: nowrap; }
        .value.problem { color: var(--error-color, #db4437); }
        .bar { position: relative; height: 18px; margin-top: 26px; }
        .bar::before { position: absolute; inset: 0; border-radius: 0 0 0 0; background: linear-gradient(to right, #003481, #0387c4); clip-path: polygon(0 82%, 100% 0, 100% 100%, 0 100%); content: ""; }
        .bar.problem::before { background: var(--error-color, #db4437); }
        .marker { position: absolute; z-index: 3; top: -2px; left: calc(var(--position) - 11px); --mdc-icon-size: 22px; color: white; filter: drop-shadow(0 1px 2px rgba(0, 0, 0, .45)); }
        .marker-value { position: absolute; z-index: 4; top: -24px; left: var(--position); transform: translateX(-50%); padding: 2px 5px; border-radius: 4px; background: var(--secondary-background-color); color: var(--primary-text-color); font-size: .75em; font-weight: 500; line-height: 1.2; white-space: nowrap; pointer-events: none; }
        .range { position: absolute; z-index: 2; right: 3px; bottom: 1px; left: 3px; display: flex; color: rgba(255, 255, 255, .7); font-size: .68em; line-height: 1; pointer-events: none; }
        .range-min { text-align: left; }
        .range-max { margin-left: auto; text-align: right; }
        .sensor-values { display: flex; flex-wrap: wrap; gap: 12px 16px; justify-content: space-between; padding: 2px 18px 18px;}
        .sensor-value { display: inline-flex; align-items: center; gap: 5px; color: var(--secondary-text-color); font-size: .82em; }
        .more-info-link { cursor: pointer; }
        .more-info-link:focus-visible { outline: 2px solid var(--primary-color); outline-offset: 2px; }
        .sensor-value ha-icon { --mdc-icon-size: 18px; }
        .sensor-value-value { color: var(--primary-text-color); font-weight: 500; white-space: nowrap; }
      </style>
      <ha-card>
        <div class="header">
          ${image ? `<img class="image more-info-link" src="${this._escape(image)}" alt="" data-entity-id="${this._escape(this._config.entity)}" role="button" tabindex="0" aria-label="Show ${this._escape(name)} details" />` : `<div class="image-placeholder more-info-link" data-entity-id="${this._escape(this._config.entity)}" role="button" tabindex="0" aria-label="Show ${this._escape(name)} details"><ha-icon icon="mdi:leaf"></ha-icon></div>`}
          <div class="title">
            <div class="name more-info-link" data-entity-id="${this._escape(this._config.entity)}" role="button" tabindex="0" aria-label="Show ${this._escape(name)} details">${this._escape(name)}</div>
            ${this._renderStatus(status, attributes.problem, this._config.entity)}
            </div>
            ${battery}
          </div>
          ${moisture ? `<div class="measurements">${moisture}</div>` : '<div class="error">No moisture sensor is configured.</div>'}
          ${readings ? `<div class="sensor-values">${readings}</div>` : ""}
      </ha-card>`;

    this.querySelectorAll(".more-info-link").forEach((element) => {
      const showMoreInfo = () => this._showMoreInfo(element.dataset.entityId);
      element.addEventListener("click", (event) => {
        event.stopPropagation();
        showMoreInfo();
      });
      element.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          event.stopPropagation();
          showMoreInfo();
        }
      });
    });

    this._rememberRenderedStates();
  }

  _hasRelevantStateChanged() {
    if (!this._renderedStates) return true;

    const entityIds = this._getWatchedEntityIds();
    if (entityIds.size !== this._renderedStates.size) return true;

    return [...entityIds].some(
      (entityId) =>
        !this._renderedStates.has(entityId) ||
        this._renderedStates.get(entityId) !== this._hass.states[entityId]
    );
  }

  _rememberRenderedStates() {
    this._renderedStates = new Map(
      [...this._getWatchedEntityIds()].map((entityId) => [entityId, this._hass.states[entityId]])
    );
  }

  _getWatchedEntityIds() {
    const plant = this._hass.states[this._config.entity];
    const sensors = plant?.attributes?.sensors || {};
    const entityIds = new Set([this._config.entity]);

    Object.values(sensors).forEach((entityId) => {
      if (typeof entityId === "string" && entityId) entityIds.add(entityId);
    });

    return entityIds;
  }

  _renderStatus(status, problem, entityId) {
    if (status !== "problem") return "";

    const problems = Array.isArray(problem) ? problem : String(problem || "").split(/\s*,\s*/);
    const labels = problems.map((item) => String(item).trim()).filter(Boolean);
    const badges = (labels.length ? labels : ["Needs attention"])
      .map((label) => `<div class="status problem more-info-link" data-entity-id="${this._escape(entityId)}" role="button" tabindex="0" aria-label="Show ${this._escape(label)} details"><ha-icon icon="mdi:alert-circle"></ha-icon>${this._escape(label)}</div>`)
      .join("");

    return `<div class="statuses">${badges}</div>`;
  }

  _renderBar(entityId, min, max) {
    if (!entityId) return "";

    const sensor = this._hass.states[entityId];
    const value = Number(sensor?.state);
    if (!sensor || !Number.isFinite(value)) return "";

    const hasMin = min !== undefined && min !== null && min !== "" && Number.isFinite(Number(min));
    const hasMax = max !== undefined && max !== null && max !== "" && Number.isFinite(Number(max));
    const minimum = hasMin ? Number(min) : undefined;
    const maximum = hasMax ? Number(max) : undefined;
    const healthy = (!hasMin || value >= minimum) && (!hasMax || value <= maximum);
    const lowReference = hasMin ? minimum : hasMax ? Math.min(value, maximum) : value;
    const highReference = hasMax ? maximum : hasMin ? Math.max(value, minimum) : value;
    const padding = Math.max(Math.abs(highReference - lowReference) * 0.2, Math.abs(value) * 0.1, 1);
    const lowerBound = hasMin && hasMax ? minimum : Math.min(value, lowReference) - padding;
    const upperBound = hasMin && hasMax ? maximum : Math.max(value, highReference) + padding;
    const span = Math.max(upperBound - lowerBound, 1);
    const position = this._clamp(((value - lowerBound) / span) * 100);
    const unit = sensor.attributes.unit_of_measurement || "";
    const currentLabel = `${this._format(value)}${unit ? ` ${unit}` : ""}`;
    const minimumLabel = hasMin ? `${this._format(minimum)}%` : "";
    const maximumLabel = hasMax ? `${this._format(maximum)}%` : "";

    return `<div class="measurement">
      <div class="bar more-info-link ${healthy ? "" : "problem"}" style="--position: ${position}%;" data-entity-id="${this._escape(entityId)}" role="button" tabindex="0" aria-label="Show moisture sensor details"><span class="marker-value">${this._escape(currentLabel)}</span><ha-icon class="marker" icon="mdi:water-percent"></ha-icon><div class="range"><span class="range-min">${this._escape(minimumLabel)}</span><span class="range-max">${this._escape(maximumLabel)}</span></div></div>
    </div>`;
  }

  _renderValue(type, entityId) {
    if (!entityId) return "";

    const sensor = this._hass.states[entityId];
    const value = Number(sensor?.state);
    if (!sensor || !Number.isFinite(value)) return "";

    const details = {
      temperature: ["Temperature", "mdi:thermometer"],
      conductivity: ["Conductivity", "mdi:lightning-bolt"],
      brightness: ["Light", "mdi:white-balance-sunny"],
    }[type];
    if (!details) return "";

    const unit = sensor.attributes.unit_of_measurement || "";
    const reading = `${this._format(value)}${unit ? ` ${unit}` : ""}`;
    return `<div class="sensor-value more-info-link" data-entity-id="${this._escape(entityId)}" role="button" tabindex="0" aria-label="Show ${this._escape(details[0])} sensor details" title="${this._escape(details[0])}"><ha-icon icon="${details[1]}"></ha-icon><span class="sensor-value-value">${this._escape(reading)}</span></div>`;
  }

  _renderBattery(entityId) {
    if (!entityId) return "";

    const battery = this._hass.states[entityId];
    const value = Number(battery?.state);
    if (!Number.isFinite(value)) return "";

    const level = value >= 40 ? "good" : value >= 20 ? "warning" : "low";
    const icon = value >= 95 ? "mdi:battery" : value < 10 ? "mdi:battery-outline" : `mdi:battery-${Math.floor(value / 10) * 10}`;
    return `<div class="battery more-info-link ${level}" data-entity-id="${this._escape(entityId)}" role="button" tabindex="0" aria-label="Show battery sensor details" title="Battery: ${this._escape(this._format(value))}%"><ha-icon icon="${icon}"></ha-icon><span>${this._escape(this._format(value))}%</span></div>`;
  }

  _showMoreInfo(entityId = this._config.entity) {
    this.dispatchEvent(new CustomEvent("hass-more-info", { detail: { entityId }, bubbles: true, composed: true }));
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
