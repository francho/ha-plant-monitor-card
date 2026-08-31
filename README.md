# FCH Plant Monitor Card

A lightweight custom Lovelace card for Home Assistant's built-in [Plant Monitor](https://www.home-assistant.io/integrations/plant/) integration. It displays the plant's sensor readings and moisture range without HACS, external frontend dependencies, or a build step.

![Plant Monitor Card preview](src/plants/monstera.png)

## Features

- Works with the built-in `plant` integration
- Local plant thumbnail or custom image
- Moisture level meter with a configurable healthy range
- Temperature, conductivity, and brightness icon readings with units
- A separate badge for each Plant Monitor problem
- Battery-level indicator
- Clickable plant, problem, and sensor details
- Uses Home Assistant theme variables

## Install manually

1. Download `fch-plant-monitor-card.js` and the `plants/` directory from a release.
2. Copy them to your Home Assistant `www` directory:

   ```text
   <config>/www/fch-plant-monitor-card.js
   <config>/www/plants/
   ```

3. In **Settings → Dashboards → Resources**, add this JavaScript module:

   ```text
   /local/fch-plant-monitor-card.js
   ```

4. Refresh the browser, then add the card to a dashboard.

### Install from a release in Home Assistant

The optional configuration at [ha-scripts/home-assistant-install-release.yaml](ha-scripts/home-assistant-install-release.yaml) downloads the latest release to `/config/www`. Copy its `shell_command` and `script` sections into your Home Assistant configuration, restart Home Assistant, and run **Install FCH Plant Monitor Card** from **Developer Tools → Actions**.

## Card configuration

```yaml
type: custom:fch-plant-monitor-card
entity: plant.monstera
name: Living room Monstera
image: /local/plants/monstera.png
min_moisture: 35
max_moisture: 70
```

| Option | Required | Default | Description |
| --- | --- | --- | --- |
| `entity` | Yes | — | A built-in `plant.*` entity. |
| `name` | No | Entity friendly name | Heading displayed by the card. |
| `image` | No | Entity picture, if present | A local or remote image URL. Use `/local/plants/<file>.png` for the included images. |
| `display_type` | No | `full` | Use `compact` for a more compact heading and to hide units by default. |
| `hide_units` | No | `false` in full mode, `true` in compact mode | Hides units beside temperature, conductivity, and brightness readings. |
| `hide_image` | No | `false` | Replaces the plant image with a leaf icon. |
| `min_moisture`, `max_moisture` | No | — | Healthy moisture range. |

The card reads sensor entity IDs and problem descriptions from the selected plant entity. Home Assistant does not expose most Plant Monitor threshold attributes (apart from `max_brightness`), so configure `min_moisture` and `max_moisture` on the card. They are read from the card configuration (`this._config`).

## Interactions

- Click the plant image, plant name, or a problem badge to open the Plant Monitor entity.
- Click the moisture meter, a secondary reading, or the battery indicator to open its underlying sensor entity.

## Local development and testing

The repository includes a Home Assistant test configuration with two simulated plants.

1. Open this repository in VS Code.
2. Run **Dev Containers: Reopen in Container**.
3. Wait for Home Assistant to start, then open the forwarded port `8123`.
4. Complete Home Assistant onboarding.
5. Open the **Plants** dashboard.
6. Change the `input_number` helpers in **Developer Tools → States** to move sensor values inside or outside their thresholds.

The development container mounts [src](src) at Home Assistant's `/config/www`, so edits to [src/fch-plant-monitor-card.js](src/fch-plant-monitor-card.js) and the local images are available after refreshing the browser.

## Create a release

Push a tag in the `v<major>.<minor>` form, such as `v1.0`. The GitHub Actions workflow packages the complete [src](src) directory into `fch-plant-monitor-card.zip` and creates a GitHub release.

## Image attribution

See [src/plants/ATTRIBUTION.md](src/plants/ATTRIBUTION.md) for the source and license of included plant images.
