<?php
/**
 * Admin settings page for Garage Door Science — Diagnostic Chat.
 *
 * Adds a Settings → GDS Chat submenu with fields for:
 *   - API key (optional, unlocks pro-tier rate limits)
 *   - Accent color override
 *   - Default heading, lede, and CTA text
 *
 * Uses the WP settings API so options are saved safely and nonce-checked.
 *
 * @package gds-chat
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Register the settings page under the Settings menu.
 */
function gds_chat_register_settings_page() {
	add_options_page(
		__( 'Garage Door Science Chat', 'gds-chat' ),
		__( 'GDS Chat', 'gds-chat' ),
		'manage_options',
		'gds-chat',
		'gds_chat_render_settings_page'
	);
}
add_action( 'admin_menu', 'gds_chat_register_settings_page' );

/**
 * Register the settings group + fields.
 */
function gds_chat_register_settings() {
	register_setting(
		'gds_chat_options_group',
		'gds_chat_options',
		array(
			'type'              => 'array',
			'sanitize_callback' => 'gds_chat_sanitize_options',
			'default'           => array(),
		)
	);

	add_settings_section(
		'gds_chat_api_section',
		__( 'API access', 'gds-chat' ),
		function () {
			echo '<p>' . esc_html__( 'Leave the key empty to use the public tier (60 calls/min per visitor IP, 2,000/day). Paste a gds_live_ key for pro-tier rate limits and deeper retrieval.', 'gds-chat' ) . ' ';
			printf(
				/* translators: %s: link to get an API key */
				esc_html__( 'Grab a free key at %s.', 'gds-chat' ),
				'<a href="https://garagedoorscience.com/developers" target="_blank" rel="noopener">garagedoorscience.com/developers</a>'
			);
			echo '</p>';
			echo '<p><strong>' . esc_html__( 'Note: Any API key you save here is sent to the visitor in page source. Only use keys for public read-only tiers. Never expose an admin or write key.', 'gds-chat' ) . '</strong></p>';
		},
		'gds-chat'
	);

	add_settings_field(
		'api_key',
		__( 'API key', 'gds-chat' ),
		'gds_chat_field_api_key',
		'gds-chat',
		'gds_chat_api_section'
	);

	add_settings_section(
		'gds_chat_display_section',
		__( 'Display', 'gds-chat' ),
		function () {
			echo '<p>' . esc_html__( 'Customize the widget copy and color. Leave blank to use defaults. Shortcode attributes override these per-page: [gds-diagnose heading="..." lede="..." cta="..."].', 'gds-chat' ) . '</p>';
		},
		'gds-chat'
	);

	add_settings_field( 'accent_color', __( 'Accent color', 'gds-chat' ), 'gds_chat_field_accent', 'gds-chat', 'gds_chat_display_section' );
	add_settings_field( 'heading', __( 'Widget heading', 'gds-chat' ), 'gds_chat_field_heading', 'gds-chat', 'gds_chat_display_section' );
	add_settings_field( 'lede', __( 'Lede text', 'gds-chat' ), 'gds_chat_field_lede', 'gds-chat', 'gds_chat_display_section' );
	add_settings_field( 'cta_label', __( 'Button label', 'gds-chat' ), 'gds_chat_field_cta', 'gds-chat', 'gds_chat_display_section' );
}
add_action( 'admin_init', 'gds_chat_register_settings' );

/**
 * Sanitize + validate all options before save.
 *
 * @param array $input Raw POST data.
 * @return array
 */
function gds_chat_sanitize_options( $input ) {
	$out = array();
	if ( isset( $input['api_key'] ) ) {
		$out['api_key'] = sanitize_text_field( $input['api_key'] );
	}
	if ( isset( $input['accent_color'] ) ) {
		$out['accent_color'] = sanitize_hex_color( $input['accent_color'] );
	}
	if ( isset( $input['heading'] ) ) {
		$out['heading'] = wp_kses_post( $input['heading'] );
	}
	if ( isset( $input['lede'] ) ) {
		$out['lede'] = wp_kses_post( $input['lede'] );
	}
	if ( isset( $input['cta_label'] ) ) {
		$out['cta_label'] = sanitize_text_field( $input['cta_label'] );
	}
	return $out;
}

/* Individual field renderers ------------------------------------------ */

function gds_chat_field_api_key() {
	$options = get_option( 'gds_chat_options', array() );
	$value   = isset( $options['api_key'] ) ? $options['api_key'] : '';
	printf(
		'<input type="text" name="gds_chat_options[api_key]" value="%s" class="regular-text" placeholder="gds_live_..." autocomplete="off" />',
		esc_attr( $value )
	);
}

function gds_chat_field_accent() {
	$options = get_option( 'gds_chat_options', array() );
	$value   = isset( $options['accent_color'] ) ? $options['accent_color'] : '#d4541a';
	printf(
		'<input type="text" name="gds_chat_options[accent_color]" value="%s" class="regular-text" placeholder="#d4541a" />',
		esc_attr( $value )
	);
	echo '<p class="description">' . esc_html__( 'Hex color for the submit button and accent elements. Default: #d4541a (garagedoorscience.com orange).', 'gds-chat' ) . '</p>';
}

function gds_chat_field_heading() {
	$options = get_option( 'gds_chat_options', array() );
	$value   = isset( $options['heading'] ) ? $options['heading'] : '';
	printf(
		'<input type="text" name="gds_chat_options[heading]" value="%s" class="regular-text" placeholder="Diagnose your garage door" />',
		esc_attr( $value )
	);
}

function gds_chat_field_lede() {
	$options = get_option( 'gds_chat_options', array() );
	$value   = isset( $options['lede'] ) ? $options['lede'] : '';
	printf(
		'<textarea name="gds_chat_options[lede]" rows="2" class="large-text" placeholder="%s">%s</textarea>',
		esc_attr__( "Describe what's happening. We'll show the likely causes, cost ranges, and whether it's safe to DIY.", 'gds-chat' ),
		esc_textarea( $value )
	);
}

function gds_chat_field_cta() {
	$options = get_option( 'gds_chat_options', array() );
	$value   = isset( $options['cta_label'] ) ? $options['cta_label'] : '';
	printf(
		'<input type="text" name="gds_chat_options[cta_label]" value="%s" class="regular-text" placeholder="Diagnose" />',
		esc_attr( $value )
	);
}

/**
 * Render the settings page shell.
 */
function gds_chat_render_settings_page() {
	if ( ! current_user_can( 'manage_options' ) ) {
		return;
	}
	?>
	<div class="wrap">
		<h1><?php esc_html_e( 'Garage Door Science — Diagnostic Chat', 'gds-chat' ); ?></h1>
		<p>
			<?php
			printf(
				/* translators: %s: [gds-diagnose] shortcode */
				esc_html__( 'Drop %s into any page or post to show the widget. See all options and runnable examples in the %s.', 'gds-chat' ),
				'<code>[gds-diagnose]</code>',
				'<a href="https://github.com/sethshoultes/wp-garagedoorscience" target="_blank" rel="noopener">GitHub repo</a>'
			);
			?>
		</p>
		<form method="post" action="options.php">
			<?php
			settings_fields( 'gds_chat_options_group' );
			do_settings_sections( 'gds-chat' );
			submit_button();
			?>
		</form>
	</div>
	<?php
}
