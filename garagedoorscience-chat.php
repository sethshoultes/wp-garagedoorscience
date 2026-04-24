<?php
/**
 * Plugin Name:       Garage Door Science — Diagnostic Chat
 * Plugin URI:        https://github.com/sethshoultes/wp-garagedoorscience
 * Description:       Embed the garagedoorscience.com AI diagnostic widget into any WordPress page via the [gds-diagnose] shortcode. Homeowners describe a problem; the widget returns likely causes, cost ranges, and safety flags.
 * Version:           0.1.0
 * Requires at least: 6.0
 * Requires PHP:      7.4
 * Author:            Seth Shoultes
 * Author URI:        https://sethshoultes.com
 * License:           MIT
 * License URI:       https://opensource.org/licenses/MIT
 * Text Domain:       gds-chat
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'GDS_CHAT_VERSION', '0.1.0' );
define( 'GDS_CHAT_PATH', plugin_dir_path( __FILE__ ) );
define( 'GDS_CHAT_URL', plugin_dir_url( __FILE__ ) );
define( 'GDS_CHAT_API_BASE', 'https://garagedoorscience.com/api/v1' );

require_once GDS_CHAT_PATH . 'includes/shortcode.php';
require_once GDS_CHAT_PATH . 'includes/settings.php';

/**
 * Register front-end assets. Only enqueued when a page actually uses the shortcode.
 */
function gds_chat_register_assets() {
	wp_register_style(
		'gds-chat',
		GDS_CHAT_URL . 'assets/gds-chat.css',
		array(),
		GDS_CHAT_VERSION
	);

	wp_register_script(
		'gds-chat',
		GDS_CHAT_URL . 'assets/gds-chat.js',
		array(),
		GDS_CHAT_VERSION,
		true
	);
}
add_action( 'wp_enqueue_scripts', 'gds_chat_register_assets' );

/**
 * Build the localized config object the JS picks up. Exposes the API base,
 * optional bearer (only if the site admin has saved one), and any brand
 * overrides from settings.
 */
function gds_chat_get_runtime_config() {
	$options = get_option( 'gds_chat_options', array() );

	$config = array(
		'apiBase'  => esc_url_raw( GDS_CHAT_API_BASE ),
		'bearer'   => ! empty( $options['api_key'] ) ? sanitize_text_field( $options['api_key'] ) : '',
		'accent'   => ! empty( $options['accent_color'] ) ? sanitize_hex_color( $options['accent_color'] ) : '#d4541a',
		'heading'  => ! empty( $options['heading'] ) ? wp_kses_post( $options['heading'] ) : __( 'Diagnose your garage door', 'gds-chat' ),
		'lede'     => ! empty( $options['lede'] ) ? wp_kses_post( $options['lede'] ) : __( "Describe what's happening. We'll show the likely causes, cost ranges, and whether it's safe to DIY.", 'gds-chat' ),
		'cta'      => ! empty( $options['cta_label'] ) ? sanitize_text_field( $options['cta_label'] ) : __( 'Diagnose', 'gds-chat' ),
		'footer'   => __( 'Powered by garagedoorscience.com', 'gds-chat' ),
		'loading'  => __( 'Thinking…', 'gds-chat' ),
		'errorMsg' => __( 'Something went wrong. Try again in a moment.', 'gds-chat' ),
		'hintFallback' => __( 'No exact match yet — try describing what you see or hear, or what the door is doing.', 'gds-chat' ),
	);

	/**
	 * Filter the runtime config before it's passed to the front-end.
	 *
	 * @param array $config
	 */
	return apply_filters( 'gds_chat_runtime_config', $config );
}

/**
 * Enqueue assets + localize config for a given shortcode instance.
 * Called by the shortcode renderer so we don't load assets on pages that
 * don't use the widget.
 */
function gds_chat_enqueue_on_demand() {
	static $done = false;
	if ( $done ) {
		return;
	}
	$done = true;

	wp_enqueue_style( 'gds-chat' );
	wp_enqueue_script( 'gds-chat' );
	wp_localize_script( 'gds-chat', 'GDS_CHAT_CONFIG', gds_chat_get_runtime_config() );
}
