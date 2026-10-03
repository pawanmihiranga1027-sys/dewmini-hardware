CREATE TABLE `orderItems` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderId` int NOT NULL,
	`productId` int,
	`productName` varchar(180) NOT NULL,
	`quantity` int NOT NULL,
	`unitPriceLkr` int NOT NULL,
	`lineTotalLkr` int NOT NULL,
	CONSTRAINT `orderItems_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderNo` varchar(32) NOT NULL,
	`customerName` varchar(180) NOT NULL,
	`phone` varchar(30) NOT NULL,
	`area` varchar(120) NOT NULL,
	`address` text NOT NULL,
	`requestedDate` varchar(30),
	`deliveryTime` varchar(80),
	`specialNote` text,
	`fulfilment` enum('delivery','pickup') NOT NULL,
	`paymentMethod` enum('cod','bank','shop') NOT NULL,
	`subtotalLkr` int NOT NULL,
	`deliveryChargeLkr` int NOT NULL DEFAULT 0,
	`totalLkr` int NOT NULL,
	`status` enum('pending','confirmed','completed','cancelled') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `orders_id` PRIMARY KEY(`id`),
	CONSTRAINT `orders_orderNo_unique` UNIQUE(`orderNo`)
);
--> statement-breakpoint
CREATE TABLE `products` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(180) NOT NULL,
	`nameSi` varchar(220) NOT NULL,
	`category` varchar(80) NOT NULL,
	`description` text NOT NULL,
	`priceLkr` int NOT NULL,
	`imageUrl` text NOT NULL,
	`badge` varchar(40),
	`isFeatured` boolean NOT NULL DEFAULT false,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `products_id` PRIMARY KEY(`id`)
);
