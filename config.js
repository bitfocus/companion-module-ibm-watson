import { Regex } from '@companion-module/base'

export const configFields = [
	{
		type: 'static-text',
		id: 'info',
		width: 12,
		label: 'Information',
		value:
			"This module is intended for use with IBM Watson for controling and seeing the state of the closed captioning service. <br /><br />Use the 'Watson server address' field below to define the starting URL for the instance's commands: e.g., 'http://server.url:8000'.",
	},
	{
		type: 'textinput',
		id: 'url',
		label: 'Watson server address',
		width: 6,
		default: 'http://example.com:8000',
		regex: Regex.URL,
	},
	{
		type: 'static-text',
		id: 'rejectUnauthorizedInfo',
		width: 12,
		value: `
			<hr />
			<h5>WARNING</h5>
			This module rejects server certificates considered invalid for the following reasons:
			<ul>
				<li>Certificate is expired</li>
				<li>Certificate has the wrong host</li>
				<li>Untrusted root certificate</li>
				<li>Certificate is self-signed</li>
			</ul>
			<p>
				We DO NOT recommend turning off this option. However, if you NEED to connect to a host
				with a self-signed certificate, you will need to set <strong>Unauthorized Certificates</strong>
				to <strong>Accept</strong>.
			</p>
			<p><strong>USE AT YOUR OWN RISK!<strong></p>
		`,
	},
	{
		type: 'dropdown',
		id: 'rejectUnauthorized',
		label: 'Unauthorized Certificates',
		width: 6,
		default: true,
		choices: [
			{ id: true, label: 'Reject' },
			{ id: false, label: 'Accept - Use at your own risk!' },
		],
	},
]
