-- phpMyAdmin SQL Dump
-- version 5.2.2
-- https://www.phpmyadmin.net/
--
-- Host: localhost:3306
-- Generation Time: May 31, 2026 at 10:33 PM
-- Server version: 8.0.45-cll-lve
-- PHP Version: 8.4.21

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `milantra_invoice_db`
--

DELIMITER $$
--
-- Procedures
--
$$

DELIMITER ;

-- --------------------------------------------------------

--
-- Table structure for table `bank_information`
--

CREATE TABLE `bank_information` (
  `id` int NOT NULL,
  `bankName` varchar(255) NOT NULL,
  `accountName` varchar(255) NOT NULL,
  `accountNumber` varchar(255) NOT NULL,
  `phoneNumber` varchar(255) NOT NULL,
  `emailAddress` varchar(255) NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `companyId` int NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

--
-- Dumping data for table `bank_information`
--

INSERT INTO `bank_information` (`id`, `bankName`, `accountName`, `accountNumber`, `phoneNumber`, `emailAddress`, `createdAt`, `updatedAt`, `companyId`) VALUES
(6, 'NAB', 'Ruban Gangadharan', '245801199 / 086466', '', 'ruban@11squaresolutions.com', '2025-07-14 01:48:40', '2026-05-22 12:43:58', 1),
(7, 'Maybank ', 'Digital 11 Technology', '5550 4133 4027', '', '', '2025-08-20 00:55:04', '2025-08-20 00:55:04', 5),
(8, 'Public Bank ', 'Prakash Marefeen', '4559429608 ', '', 'prakashmarefeen@gmail.com', '2025-10-04 04:09:07', '2025-10-04 04:09:07', 10),
(9, 'Public Bank ', 'Gangadharan Valayudha', '4814940526', '0123802085', 'force11s@hotmail.com', '2025-12-12 02:11:55', '2025-12-12 02:11:55', 11),
(10, 'Maybank ', 'K RadhaDevi ', '105047132785', '0126242948', 'force11s@hotmail.com', '2025-12-12 02:15:45', '2025-12-12 02:15:45', 12),
(11, 'HSBC Malaysia', 'Shamala Ruban Gangadharan', '201415353108', '0126242948', 'force11s@hotmail.com', '2025-12-12 02:19:17', '2025-12-12 02:19:17', 13),
(12, 'CIMB', '11 Square Solutions PLT', '8605836900', '0126242948', '', '2026-05-22 12:53:56', '2026-05-22 12:53:56', 14);

-- --------------------------------------------------------

--
-- Table structure for table `categories`
--

CREATE TABLE `categories` (
  `category_id` int NOT NULL,
  `categoryName` varchar(255) NOT NULL,
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `companyID` int DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

--
-- Dumping data for table `categories`
--

INSERT INTO `categories` (`category_id`, `categoryName`, `createdAt`, `updatedAt`, `companyID`) VALUES
(1, 'RJ45 Lan Cables', '2025-05-20 07:05:33', '2025-05-20 07:05:33', 0),
(2, 'LAN Clips', '2025-05-20 07:05:44', '2025-05-20 07:05:44', 0),
(3, 'Fiber Port Connector', '2025-05-20 07:05:58', '2025-05-20 07:05:58', 0),
(4, 'Switch HLX 15', '2025-05-20 07:06:13', '2025-05-20 07:06:13', 0),
(5, 'TPlink Load Balancer', '2025-05-20 07:06:34', '2025-05-20 07:06:34', 0),
(6, 'Web Hosting Renewal', '2025-06-15 04:12:25', '2025-06-15 04:12:25', 0),
(7, 'Services', '2025-06-18 02:07:16', '2025-06-18 02:07:16', 0),
(8, 'Product 1', '2025-07-11 07:53:08', '2025-07-11 07:53:08', 0);

-- --------------------------------------------------------

--
-- Table structure for table `companyInfos`
--

CREATE TABLE `companyInfos` (
  `company_id` int NOT NULL,
  `company_name` varchar(255) DEFAULT NULL,
  `logo` varchar(255) DEFAULT NULL,
  `currency` varchar(255) DEFAULT NULL,
  `color` varchar(255) DEFAULT NULL,
  `bg_color` varchar(255) DEFAULT NULL,
  `inv_no_prefix` varchar(255) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `is_deleted` tinyint(1) NOT NULL DEFAULT '0',
  `created_by` int DEFAULT NULL,
  `modified_by` int DEFAULT NULL,
  `Address` varchar(255) DEFAULT NULL,
  `Phone` varchar(255) DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

--
-- Dumping data for table `companyInfos`
--

INSERT INTO `companyInfos` (`company_id`, `company_name`, `logo`, `currency`, `color`, `bg_color`, `inv_no_prefix`, `is_active`, `is_deleted`, `created_by`, `modified_by`, `Address`, `Phone`, `createdAt`, `updatedAt`) VALUES
(1, '11 Square Solutions', '1749030987701-transparent.png', 'MYR', '', '#ffffff', '11SS', 1, 0, NULL, NULL, 'D-38-06, Dataran 3 Two, No. 2 Jalan 19/1, 46300 Petaling Jaya, Selangor', '0420296504', '2025-05-20 05:46:37', '2026-05-22 12:42:54'),
(2, 'Digital 11 Technology', '1748600834455-Media (4).jpg', 'MYR', '#603681', '#f3dde3', '11Tech', 0, 0, NULL, NULL, 'lot 2927 Jalan Sua Betong', '12345678', '2025-05-20 05:54:48', '2025-07-08 03:17:23'),
(5, ' Digital 11 Technology', '1752664436582-logo PNG.png', 'MYR', '', '#ffffff', '11D', 1, 0, NULL, NULL, 'D-38-06, Dataran 3 Two, No. 2 Jalan 19/1, 46300 Petaling Jaya, Selangor', '+6012-6242948', '2025-06-13 02:55:48', '2025-09-25 05:38:21'),
(9, 'Nowgray IT Services ', '1752816201998-Nowgray.png', 'BDT', '#e6c1c1', '#c9bde5', 'NG', 0, 0, NULL, NULL, 'Lucknow', '8945658978', '2025-07-11 07:37:27', '2025-12-01 04:22:51'),
(10, 'Prakash Marefeen', '', 'MYR', '', '#69a4e2', 'PM', 1, 0, NULL, NULL, '238 JALAN KENANGA 7/7 BANDAR AMANJAYA 08000 SUNGAI PETANI KEDAH', '60125782312', '2025-10-04 04:06:59', '2025-10-04 04:20:03'),
(11, 'Gangadharan Valayudha', '', 'MYR', '', '', 'GV', 1, 0, NULL, NULL, 'Taman Ria Km3, Jalan Seremban, No.1966 Port Dickson, N.S ', '0123802085', '2025-12-12 02:09:32', '2025-12-12 02:09:32'),
(12, 'K RadhaDevi ', '', 'MYR', '', '', 'K', 1, 0, NULL, NULL, 'No 585 Jalan 3/23, taman forest heights, broadhill residence, seremban', '0126242948', '2025-12-12 02:14:12', '2025-12-12 02:14:12'),
(13, 'Ruban Gangadharan', '', 'MYR', '', '', 'RG', 1, 0, NULL, NULL, 'Lot 2927 Kg Baru Sungai Menyala, Jalan Sua Betong, Port Dickson', '0126242948', '2025-12-12 02:17:14', '2025-12-12 02:17:14'),
(14, '11 Square Solutions PLT (MY)', '1779943469271-transparent.png', 'MYR', '', '#ffffff', '11SS-MY', 1, 0, NULL, NULL, 'D-38-06, Dataran 3 Two, No. 2 Jalan 19/1, 46300 Petaling Jaya, Selangor', '0126242948', '2026-05-22 12:53:23', '2026-05-29 01:45:57');

-- --------------------------------------------------------

--
-- Table structure for table `customers`
--

CREATE TABLE `customers` (
  `customer_id` int NOT NULL,
  `company_id` int NOT NULL,
  `name` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `phone` varchar(255) DEFAULT NULL,
  `address` varchar(255) DEFAULT NULL,
  `company_name` varchar(255) NOT NULL,
  `status` tinyint(1) DEFAULT NULL,
  `customer_address` tinyint(1) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `is_deleted` tinyint(1) NOT NULL DEFAULT '0',
  `created_by` int DEFAULT NULL,
  `modified_by` int DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

--
-- Dumping data for table `customers`
--

INSERT INTO `customers` (`customer_id`, `company_id`, `name`, `email`, `phone`, `address`, `company_name`, `status`, `customer_address`, `is_active`, `is_deleted`, `created_by`, `modified_by`, `createdAt`, `updatedAt`) VALUES
(1, 1, 'DDS Perth', 'force11s@hotmail.com', '0123456789', 'Nil', '', 1, NULL, 1, 0, NULL, NULL, '2025-05-20 06:18:35', '2025-08-25 09:55:57'),
(6, 5, 'DDS Perth', '11digital@11squaresolutions.com', '12458852', 'Perth', '', 1, NULL, 1, 1, NULL, NULL, '2025-06-14 01:26:23', '2025-07-08 03:28:43'),
(7, 1, 'Maxia Group', 'force11s@yahoo.com', '123456', 'Perth Australia', '', 1, NULL, 1, 0, NULL, NULL, '2025-06-15 04:17:17', '2025-06-15 04:25:22'),
(8, 1, 'WA Interpreters', 'force11s@hotmail.com', '123456789', 'Perth Australia', '', 1, NULL, 1, 0, NULL, NULL, '2025-06-18 02:15:09', '2025-06-19 11:32:53'),
(14, 5, 'Oshtrainers', 'force11s@hotmail.com', '12', 'Seremban Negeri Sembilan', '', 1, NULL, 1, 0, NULL, NULL, '2025-07-08 03:28:25', '2025-07-08 03:28:25'),
(15, 9, 'Priya Sharma', 'priya.sharma@nowgray.live', '8945786589', 'Lucknow', '', 1, NULL, 0, 1, NULL, NULL, '2025-07-11 07:45:17', '2025-12-01 04:22:51'),
(16, 9, 'Amit Sahu', 'amit.sahu@nowgray.live', '8945785632', 'Lucknow', '', 1, NULL, 0, 1, NULL, NULL, '2025-07-11 07:46:57', '2025-12-01 04:22:51'),
(17, 1, 'Property & Building Control Consultants Pty Ltd', 'force11s@hotmail.com', '123', 'Australia Perth', '', 1, NULL, 1, 0, NULL, NULL, '2025-07-14 01:38:16', '2025-07-14 01:38:16'),
(18, 5, 'Meta Fit Tribe Sdn. Bhd', 'force11s@hotmail.com', '123', '123', '', 1, NULL, 1, 0, NULL, NULL, '2025-08-20 00:58:02', '2025-08-20 00:58:02'),
(19, 9, 'Amit Sahu', 'amit.sahu@nowgray.live', '9854789865', 'Lucknow', '', 1, NULL, 0, 1, NULL, NULL, '2025-08-25 07:39:51', '2025-12-01 04:22:51'),
(20, 5, 'Sureze SDN BHD', 'force11s@hotmail.com', '123', 'Puchong', '', 1, NULL, 1, 0, NULL, NULL, '2025-09-16 02:45:05', '2025-09-16 02:45:05'),
(21, 10, 'Digital 11 Technology', 'f@f.com', '0126242948', 'NS', '', 1, NULL, 1, 0, NULL, NULL, '2025-10-04 04:16:08', '2025-10-04 04:16:08'),
(22, 5, 'Hakem Arabi & Associates', 'force11s@hotmail.com', '066013421', 'No.94 First Floor, Jalan S 2/B19, Seremban', '', 1, NULL, 1, 0, NULL, NULL, '2025-12-10 07:55:42', '2025-12-10 07:55:42'),
(23, 12, 'Sureze Sdn Bhd', 'f@f.com', '123', 'D-10-2, Block D, Plaza Paragon Point, Jalan Medan Pusat Bandar 5, 43650 Bandar Baru Bangi, Selangor', '', 1, NULL, 1, 0, NULL, NULL, '2025-12-12 02:30:27', '2025-12-12 02:31:15'),
(24, 1, 'Sureze Sdn Bhd ', 'f@f.com', '123', 'D-10-2, Block D, Plaza Paragon Point, Jalan Medan Pusat Bandar 5, 43650 Bandar Baru Bangi, Selangor ', '', 1, NULL, 1, 0, NULL, NULL, '2025-12-12 02:32:01', '2026-05-22 12:11:57'),
(25, 11, 'Sureze Sdn Bhd', 'f@f.com', '123', 'D-10-2, Block D, Plaza Paragon Point, Jalan Medan Pusat Bandar 5, 43650 Bandar Baru Bangi, Selangor ', '', 1, NULL, 1, 0, NULL, NULL, '2025-12-12 02:33:03', '2025-12-12 02:33:03'),
(26, 1, 'Quantam Pacific Engineering', 'force11s@hotmail.com', '123', '123', '', 1, NULL, 1, 0, NULL, NULL, '2026-01-07 03:33:33', '2026-01-07 03:33:33'),
(27, 1, 'Milan Trade', 'force11s@hotmail.com', '123', 'Tambwe', '', 1, NULL, 1, 0, NULL, NULL, '2026-01-07 03:34:16', '2026-01-07 03:34:16'),
(28, 14, 'ARPRO Training & Consultancy', 'aar@arpro.com.my', '123', 'Nil', '', 1, NULL, 1, 1, NULL, NULL, '2026-05-26 03:13:24', '2026-05-28 04:17:32'),
(29, 13, 'ARPRO Training & Consultancy', 'aar@arpro.com.my', '1234', 'aar@arpro.com.my', '', 1, NULL, 1, 0, NULL, NULL, '2026-05-26 03:23:10', '2026-05-26 03:23:10'),
(30, 14, 'Rexharbour Sdn Bhd', 'r@r.com', '123', 'Nil', '', 1, NULL, 1, 0, NULL, NULL, '2026-05-28 04:15:38', '2026-05-28 04:15:38');

-- --------------------------------------------------------

--
-- Table structure for table `invoiceHistories`
--

CREATE TABLE `invoiceHistories` (
  `history_id` int NOT NULL,
  `company_id` int NOT NULL,
  `invoice_id` varchar(255) DEFAULT NULL,
  `invoice_number` varchar(255) DEFAULT NULL,
  `customer_id` varchar(255) DEFAULT NULL,
  `pdf_name` varchar(255) DEFAULT NULL,
  `pdf_path` varchar(255) DEFAULT NULL,
  `sent_at` datetime DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `modified_by` int DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `uniqueness` int DEFAULT NULL,
  `prefix` varchar(500) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

--
-- Dumping data for table `invoiceHistories`
--

INSERT INTO `invoiceHistories` (`history_id`, `company_id`, `invoice_id`, `invoice_number`, `customer_id`, `pdf_name`, `pdf_path`, `sent_at`, `email`, `created_by`, `modified_by`, `createdAt`, `updatedAt`, `uniqueness`, `prefix`) VALUES
(1, 1, '16', '62082000', '7', 'invoice-62082000-2025-07-08_03-21-31.txt', '/home2/milantra/invoice-api.myycrowsoft.com/txt/invoice-62082000-2025-07-08_03-21-31.txt', '2025-07-08 03:21:31', 'force11s@yahoo.com', NULL, NULL, '2025-07-08 03:21:33', '2025-07-08 03:21:33', 2471, '11SS'),
(2, 1, '59', '51048731', '17', 'invoice-51048731-2025-07-14_01-42-29.txt', '/home2/milantra/invoice-api.myycrowsoft.com/txt/invoice-51048731-2025-07-14_01-42-29.txt', '2025-07-14 01:42:29', 'force11s@hotmail.com', NULL, NULL, '2025-07-14 01:42:31', '2025-07-14 01:42:31', 8482, '11SS'),
(3, 1, '59', '51048731', '17', 'invoice-51048731-2025-07-14_01-50-38.txt', '/home2/milantra/invoice-api.myycrowsoft.com/txt/invoice-51048731-2025-07-14_01-50-38.txt', '2025-07-14 01:50:38', 'force11s@hotmail.com', NULL, NULL, '2025-07-14 01:50:39', '2025-07-14 01:50:39', 2811, '11SS'),
(4, 1, '84', '25114500', '8', 'invoice-25114500-2025-07-31_03-28-12.txt', '/home2/milantra/invoice-api.myycrowsoft.com/txt/invoice-25114500-2025-07-31_03-28-12.txt', '2025-07-31 03:28:12', 'force11s@hotmail.com', NULL, NULL, '2025-07-31 03:28:16', '2025-07-31 03:28:16', 7696, '11SS'),
(5, 5, '90', '94306375', '18', 'invoice-94306375-2025-08-20_01-00-31.txt', '/home2/milantra/invoice-api.myycrowsoft.com/txt/invoice-94306375-2025-08-20_01-00-31.txt', '2025-08-20 01:00:31', 'force11s@hotmail.com', NULL, NULL, '2025-08-20 01:00:33', '2025-08-20 01:00:33', 3607, '11D'),
(6, 1, '85', '39289704', '1', 'invoice-39289704-2025-08-25_09-50-23.txt', '/home2/milantra/invoice-api.myycrowsoft.com/txt/invoice-39289704-2025-08-25_09-50-23.txt', '2025-08-25 09:50:23', 'force111s@hotmail.com', NULL, NULL, '2025-08-25 09:50:26', '2025-08-25 09:50:26', 7525, '11SS'),
(7, 1, '85', '39289704', '1', 'invoice-39289704-2025-08-25_09-54-08.txt', '/home2/milantra/invoice-api.myycrowsoft.com/txt/invoice-39289704-2025-08-25_09-54-08.txt', '2025-08-25 09:54:08', 'force111s@hotmail.com', NULL, NULL, '2025-08-25 09:54:13', '2025-08-25 09:54:13', 7664, '11SS'),
(8, 5, '90', '94306375', '18', 'invoice-94306375-2025-08-25_09-55-15.txt', '/home2/milantra/invoice-api.myycrowsoft.com/txt/invoice-94306375-2025-08-25_09-55-15.txt', '2025-08-25 09:55:15', 'force11s@hotmail.com', NULL, NULL, '2025-08-25 09:55:16', '2025-08-25 09:55:16', 4225, '11D');

-- --------------------------------------------------------

--
-- Table structure for table `invoices`
--

CREATE TABLE `invoices` (
  `invoice_id` int NOT NULL,
  `company_id` int NOT NULL,
  `invoice_type` varchar(255) NOT NULL,
  `invoice_no` varchar(255) NOT NULL,
  `issue_date` datetime DEFAULT NULL,
  `due_date` datetime DEFAULT NULL,
  `customer_id` int NOT NULL,
  `status` varchar(255) DEFAULT NULL,
  `total_amount` decimal(10,2) DEFAULT NULL,
  `is_recurring` tinyint(1) DEFAULT NULL,
  `qr_code` varchar(255) DEFAULT NULL,
  `description` varchar(255) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `is_deleted` tinyint(1) NOT NULL DEFAULT '0',
  `created_by` int DEFAULT NULL,
  `modified_by` int DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `invoice_patent` int DEFAULT '0',
  `recurring_type` varchar(255) DEFAULT NULL,
  `recurring_start_date` date DEFAULT NULL,
  `recurring_end_date` date DEFAULT NULL,
  `recurring_times` int DEFAULT NULL,
  `recurring_completed` int DEFAULT '0',
  `inv_prefix` varchar(255) DEFAULT NULL,
  `tax_percent` varchar(255) DEFAULT NULL,
  `tax_type` varchar(255) DEFAULT NULL,
  `NextDate` datetime DEFAULT NULL,
  `recurring_complet` int DEFAULT '0',
  `currency` varchar(255) NOT NULL,
  `discountType` varchar(255) DEFAULT NULL,
  `discountValue` varchar(255) DEFAULT NULL,
  `remark` text,
  `is_removed_from_dashboard` tinyint(1) NOT NULL DEFAULT '0'
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

--
-- Dumping data for table `invoices`
--

INSERT INTO `invoices` (`invoice_id`, `company_id`, `invoice_type`, `invoice_no`, `issue_date`, `due_date`, `customer_id`, `status`, `total_amount`, `is_recurring`, `qr_code`, `description`, `is_active`, `is_deleted`, `created_by`, `modified_by`, `createdAt`, `updatedAt`, `invoice_patent`, `recurring_type`, `recurring_start_date`, `recurring_end_date`, `recurring_times`, `recurring_completed`, `inv_prefix`, `tax_percent`, `tax_type`, `NextDate`, `recurring_complet`, `currency`, `discountType`, `discountValue`, `remark`, `is_removed_from_dashboard`) VALUES
(1, 1, 'Quotation', '77890612', '2025-05-20 00:00:00', '2025-05-27 00:00:00', 1, '1', 568150.00, 1, '', NULL, 1, 1, 0, 0, '2025-05-20 12:59:59', '2025-05-27 09:56:39', 1, 'yearly', '2025-05-20', '2028-05-20', 4, 0, '11SS', '10', 'gst', '2025-05-20 00:00:00', 1, 'MYR', 'percentage', '10', NULL, 0),
(2, 2, 'Quotation', '51405389', '2025-05-21 00:00:00', '2025-06-30 00:00:00', 2, '1', 218978.65, 1, '', NULL, 0, 1, 0, 0, '2025-05-21 06:07:14', '2025-07-08 03:18:50', 2, 'weekly', '2025-06-01', '2025-06-30', 5, 0, '11Tech', '8', 'sst', NULL, 5, 'USD', 'amount', '200', NULL, 0),
(5, 2, 'Invoice', '22473728', '2025-05-26 00:00:00', '2025-06-10 00:00:00', 2, '1', 103570.00, 0, '', NULL, 0, 1, 0, 0, '2025-05-26 04:47:25', '2025-07-08 03:18:43', 0, '', '0000-00-00', '0000-00-00', 0, 0, '11Tech', '8', 'sst', '0000-00-00 00:00:00', 0, 'MYR', 'amount', '8', NULL, 0),
(7, 1, 'Invoice', '67758100', '2025-05-29 00:00:00', '2025-06-01 00:00:00', 1, '1', 440.00, 0, '', NULL, 1, 1, 0, 0, '2025-05-29 05:54:15', '2025-07-08 03:16:27', 2, '', '0000-00-00', '0000-00-00', 0, 0, '11SS', '5', 'gst', '0000-00-00 00:00:00', 0, 'BIF', 'amount', '', NULL, 0),
(8, 1, 'Quotation', '82493809', '2025-05-29 00:00:00', '2025-05-31 00:00:00', 1, '1', 880.00, 0, '', NULL, 1, 1, 0, 0, '2025-05-29 05:54:48', '2025-07-08 03:16:23', 2, '', '0000-00-00', '0000-00-00', 0, 0, '11SS', '7', 'gst', '0000-00-00 00:00:00', 0, 'BMD', 'percentage', '', NULL, 0),
(9, 1, 'Quotation', '40789520', '2025-06-06 00:00:00', '2025-06-11 00:00:00', 1, '1', 35482.00, 1, '', NULL, 1, 1, 0, 0, '2025-06-04 09:58:38', '2025-07-08 03:16:20', 1, 'weekly', '2025-06-06', '2025-10-23', 20, 0, '11SS', '', '', '2025-07-18 00:00:00', 6, 'MYR', '', '', NULL, 0),
(12, 5, 'Invoice', '92239930', '2025-06-14 00:00:00', '2025-06-17 00:00:00', 6, '1', 2767.50, 0, '', NULL, 1, 1, 0, 0, '2025-06-14 01:28:36', '2025-07-08 03:16:15', 2, '', '0000-00-00', '0000-00-00', 0, 0, '11D', '8', 'sst', '0000-00-00 00:00:00', 0, 'MYR', '', '', NULL, 0),
(13, 1, 'Invoice', '67723375', '2025-06-14 00:00:00', '2025-07-12 00:00:00', 1, '1', 554.00, 0, '', NULL, 1, 1, 0, 0, '2025-06-14 05:31:34', '2025-07-08 03:16:10', 0, '', '0000-00-00', '0000-00-00', 0, 0, '11SS', '10', 'sst', NULL, 0, 'BMD', 'amount', '1000', NULL, 0),
(14, 1, 'Invoice', '34962193', '2025-06-14 00:00:00', '2025-07-12 00:00:00', 1, '1', 553.50, 0, '', NULL, 1, 1, 0, 0, '2025-06-14 05:43:35', '2025-07-08 03:16:03', 0, '', '0000-00-00', '0000-00-00', 0, 0, '11SS', '', '', '0000-00-00 00:00:00', 0, 'MYR', 'amount', '0', NULL, 0),
(15, 1, 'Invoice', '89697497', '2025-06-14 00:00:00', '2025-07-11 00:00:00', 1, '1', 553.50, 0, '', NULL, 1, 1, 0, 0, '2025-06-14 05:59:42', '2025-07-08 03:15:57', 0, '', '0000-00-00', '0000-00-00', 0, 0, '11SS', '10', 'sst', NULL, 0, 'BND', 'amount', '100', NULL, 0),
(16, 1, 'Invoice', '62082000', '2025-06-15 00:00:00', '2025-06-23 00:00:00', 7, '1', 280.00, 1, '', NULL, 1, 0, 0, 0, '2025-06-15 04:19:34', '2026-05-19 04:23:37', 1, 'yearly', '2025-06-01', '2026-06-01', 2, 0, '11SS', '', '', '2027-06-01 00:00:00', 1, 'AUD', '', '', NULL, 0),
(17, 2, 'Invoice', '62507012', '2025-06-16 00:00:00', '2025-07-12 00:00:00', 2, '1', 11000.00, 0, '', NULL, 0, 1, 0, 0, '2025-06-16 11:58:06', '2025-07-08 03:18:56', 2, '', '0000-00-00', '0000-00-00', 0, 0, '11Tech', '10', 'gst', '0000-00-00 00:00:00', 0, 'BIF', 'amount', '100', NULL, 0),
(18, 1, 'Invoice', '61776822', '2025-06-18 00:00:00', '2025-06-23 00:00:00', 8, '1', 350.00, 0, '', NULL, 1, 0, 0, 0, '2025-06-18 02:17:52', '2025-06-22 04:57:25', 0, '', '0000-00-00', '0000-00-00', 0, 0, '11SS', '', '', '0000-00-00 00:00:00', 0, 'AUD', '', '', NULL, 0),
(20, 1, 'Purchase Order', '15931169', '2025-06-22 00:00:00', '2025-06-27 00:00:00', 7, '1', 18875.00, 1, '', NULL, 1, 1, 0, 0, '2025-06-22 07:10:08', '2025-07-08 03:14:47', 1, 'monthly', '2025-06-22', '2025-12-22', 7, 0, '11SS', '10', 'gst', '2025-08-22 00:00:00', 3, 'AUD', 'amount', '200', NULL, 0),
(21, 1, 'Purchase Order', '36228209', '2025-07-22 00:00:00', '2025-07-02 00:00:00', 7, '1', 18875.00, 0, NULL, NULL, 1, 1, NULL, NULL, '2025-06-24 11:57:32', '2025-07-08 03:14:41', 1, NULL, NULL, NULL, 7, 0, '11SS', '10', 'gst', NULL, 0, 'AUD', 'amount', '200', NULL, 0),
(22, 1, 'Quotation', '35864494', '2025-06-27 00:00:00', '2025-07-03 00:00:00', 1, '1', 35482.00, 0, NULL, NULL, 1, 1, NULL, NULL, '2025-06-24 12:04:11', '2025-07-08 03:15:00', 1, NULL, NULL, NULL, 20, 0, '11SS', '', '', NULL, 0, 'MYR', '', '', NULL, 0),
(35, 2, 'Quotation', '81620327', '2025-06-26 00:00:00', '2025-07-03 00:00:00', 2, '1', 218978.65, 1, NULL, NULL, 0, 1, NULL, NULL, '2025-06-26 01:28:36', '2025-07-08 03:18:35', 2, 'weekly', '2025-06-26', '2025-09-26', 14, 0, '11Tech', '8', 'sst', '2025-07-17 00:00:00', 3, 'USD', 'amount', '200', NULL, 0),
(36, 2, 'Quotation', '93451709', '2025-06-26 00:00:00', '2025-06-30 00:00:00', 2, '1', 218978.65, 0, NULL, NULL, 0, 1, NULL, NULL, '2025-06-26 01:33:34', '2025-07-08 03:18:28', 2, NULL, NULL, NULL, 14, 0, '11Tech', '8', 'sst', NULL, 0, 'USD', 'amount', '200', NULL, 0),
(41, 1, 'Quotation', '84401588', '2025-07-04 00:00:00', '2025-07-15 00:00:00', 1, '1', 35482.00, 0, NULL, NULL, 1, 1, NULL, NULL, '2025-06-26 05:39:59', '2025-07-08 03:15:49', 1, NULL, NULL, NULL, 20, 0, '11SS', '', '', NULL, 0, 'MYR', '', '', NULL, 0),
(42, 2, 'Quotation', '15456081', '2025-07-06 00:00:00', '2025-07-03 00:00:00', 2, '1', 218978.65, 0, NULL, NULL, 0, 1, NULL, NULL, '2025-06-26 05:49:30', '2025-07-08 03:18:23', 2, NULL, NULL, NULL, 5, 0, '11Tech', '8', 'sst', NULL, 0, 'USD', 'amount', '200', NULL, 0),
(45, 2, 'Quotation', '35415510', '2025-07-10 00:00:00', '2025-07-02 00:00:00', 2, '1', 218978.65, 0, NULL, NULL, 0, 1, NULL, NULL, '2025-06-26 05:57:37', '2025-07-08 03:18:15', 2, NULL, NULL, NULL, 14, 0, '11Tech', '8', 'sst', NULL, 0, 'USD', 'amount', '200', NULL, 0),
(46, 1, 'Quotation', '27117119', '2025-07-11 00:00:00', '2025-07-03 00:00:00', 1, '1', 35482.00, 0, NULL, NULL, 1, 1, NULL, NULL, '2025-06-26 05:57:50', '2025-07-08 03:15:35', 1, NULL, NULL, NULL, 20, 0, '11SS', '', '', NULL, 0, 'MYR', '', '', NULL, 0),
(48, 2, 'Quotation', '77907652', '2025-07-13 00:00:00', '2025-07-18 00:00:00', 2, '1', 218978.65, 0, NULL, NULL, 0, 1, NULL, NULL, '2025-06-26 06:01:18', '2025-07-08 03:18:07', 2, NULL, NULL, NULL, 5, 0, '11Tech', '8', 'sst', NULL, 0, 'USD', 'amount', '200', NULL, 0),
(52, 1, 'Invoice', '43445196', '2025-07-01 00:00:00', '2025-07-10 00:00:00', 1, '1', 374.00, 0, '', NULL, 1, 0, 0, 0, '2025-07-01 02:28:16', '2025-07-01 02:30:11', 1, '', '0000-00-00', '0000-00-00', 0, 0, '11SS', '', '', '0000-00-00 00:00:00', 0, 'AUD', '', '', NULL, 0),
(58, 5, 'Invoice', '89773900', '2025-01-30 00:00:00', '2025-02-10 00:00:00', 14, '1', 560.00, 1, '', NULL, 1, 0, 0, 0, '2025-07-08 03:33:35', '2026-01-02 02:59:25', 0, 'yearly', '2025-01-30', '2026-01-30', 0, 0, '11D', '', '', NULL, 1, 'MYR', '', '', 'Yearly Renewal ', 0),
(59, 1, 'Quotation', '51048731', '2025-07-10 00:00:00', '2025-07-30 00:00:00', 17, '1', 1420.00, 0, '', NULL, 0, 0, 0, 0, '2025-07-10 09:59:42', '2025-08-31 03:20:02', 2, NULL, NULL, NULL, 0, 0, '11SS', '', '', NULL, 0, 'AUD', '', '', '50% to be paid to start the project, once completed and turnover balance 50%', 1),
(82, 5, 'Invoice', '30379147', '2025-07-09 00:00:00', '2025-07-31 00:00:00', 14, '1', 750.00, 0, '', NULL, 1, 1, 0, 0, '2025-07-16 11:15:50', '2025-07-20 08:36:13', 0, '', '0000-00-00', '0000-00-00', 0, 0, '11D', '', '', NULL, 0, 'MYR', '', '', 'This invoice is related to another invoice generated in december 2024', 0),
(83, 1, 'Quotation', '42986796', '2025-07-09 00:00:00', '2025-07-31 00:00:00', 17, '1', 44500.00, 0, '', NULL, 1, 1, 0, 0, '2025-07-16 11:19:33', '2025-07-20 08:35:57', 1, NULL, NULL, NULL, 0, 0, '11SS', '', '', NULL, 0, 'MYR', '', '', 'related to invoice no SG112345', 0),
(84, 1, 'Invoice', '25114500', '2025-07-31 00:00:00', '2025-08-08 00:00:00', 8, '1', 880.00, 0, '', NULL, 1, 0, 0, 0, '2025-07-31 02:57:57', '2025-07-31 02:57:57', 0, '', '0000-00-00', '0000-00-00', 0, 0, '11SS', '', '', NULL, 0, 'AUD', '', '', '', 0),
(85, 1, 'Invoice', '39289704', '2025-09-02 00:00:00', '2025-09-09 00:00:00', 1, '1', 275.00, 1, '', NULL, 1, 0, 0, 0, '2025-08-02 04:02:04', '2025-08-25 09:50:07', 2, 'monthly', '2025-09-02', '2026-03-02', 8, 0, '11SS', '', '', '2025-09-02 00:00:00', 0, 'AUD', '', '', 'Monthly SMO and Basic website Maintenance', 1),
(86, 1, 'Invoice', '69041067', '2025-08-13 00:00:00', '2025-08-30 00:00:00', 7, '1', 2933.55, 1, '', NULL, 1, 1, 0, 0, '2025-08-13 01:58:40', '2025-08-14 10:27:15', 0, 'monthly', '2025-09-13', '2025-10-13', 2, 0, '11SS', '', '', '2025-10-13 00:00:00', 1, 'MYR', '', '', '', 0),
(87, 1, 'Invoice', '46073073', '2025-09-13 00:00:00', '2025-08-30 00:00:00', 7, '1', 2933.55, 0, NULL, NULL, 1, 1, NULL, NULL, '2025-08-13 01:59:03', '2025-08-14 10:27:19', 0, NULL, NULL, NULL, 0, 0, '11SS', '', '', NULL, 0, 'MYR', '', '', '', 0),
(88, 1, 'Invoice', '28071891', '2025-08-14 00:00:00', '2025-08-24 00:00:00', 7, '1', 110.70, 1, '', NULL, 1, 1, 0, 0, '2025-08-14 10:35:54', '2025-08-20 00:38:50', 0, 'monthly', '2025-09-14', '2025-11-14', 3, 0, '11SS', '', '', '2025-10-14 00:00:00', 1, 'MYR', '', '', '', 0),
(89, 1, 'Invoice', '19673263', '2025-09-14 00:00:00', '2025-09-24 00:00:00', 7, '1', 110.70, 0, NULL, NULL, 1, 1, NULL, NULL, '2025-08-14 10:38:12', '2025-08-20 00:38:24', 0, NULL, NULL, NULL, 3, 0, '11SS', '', '', NULL, 0, 'MYR', '', '', '', 0),
(90, 5, 'Invoice', '94306375', '2025-08-20 00:00:00', '2025-08-27 00:00:00', 18, '1', 3000.00, 0, '', NULL, 1, 0, 0, 0, '2025-08-20 00:51:19', '2025-08-20 01:00:13', 1, NULL, NULL, NULL, 0, 0, '11D', '', '', NULL, 0, 'MYR', '', '', '', 0),
(92, 9, 'Invoice', '99784747', '2025-07-25 00:00:00', '2025-07-27 00:00:00', 19, '1', 800.00, 1, '', NULL, 0, 0, 0, 0, '2025-08-25 07:50:32', '2025-12-01 04:22:51', 0, 'weekly', '2025-07-25', '2025-08-25', 0, 0, 'NG', '', 'sst', NULL, 0, 'BIF', 'percentage', '5', 'test', 1),
(93, 9, 'Invoice', '32262392', '2025-07-25 00:00:00', '2025-07-31 00:00:00', 19, '1', 4800.00, 0, '', NULL, 0, 0, 0, 0, '2025-08-25 09:31:32', '2025-12-01 04:22:51', 0, '', '0000-00-00', '0000-00-00', 0, 0, 'NG', '18', 'gst', NULL, 0, 'BIF', 'percentage', '5', '', 1),
(94, 1, 'Invoice', '22840154', '2025-09-02 00:00:00', '2025-09-09 00:00:00', 1, '1', 275.00, 1, '', NULL, 1, 0, 0, 0, '2025-08-25 09:58:42', '2026-04-15 10:01:18', 2, 'monthly', '2025-09-02', '2026-03-02', 7, 0, '11SS', '', '', '2026-03-02 00:00:00', 6, 'AUD', '', '', '', 1),
(95, 1, 'Invoice', '19660957', '2025-09-02 00:00:00', '2025-09-09 00:00:00', 1, '1', 275.00, 0, NULL, NULL, 1, 0, NULL, NULL, '2025-08-26 12:31:49', '2025-09-01 02:14:36', 2, NULL, NULL, NULL, 0, 0, '11SS', '', '', NULL, 0, 'AUD', '', '', 'This is invoice is for the month of August SMO completion', 0),
(96, 9, 'Invoice', '26039468', '2025-08-22 00:00:00', '2025-08-31 00:00:00', 15, '1', 800.00, 1, '', NULL, 0, 0, 0, 0, '2025-08-27 04:42:56', '2025-12-01 04:22:51', 0, 'weekly', '2025-08-27', '2025-09-27', 5, 0, 'NG', '5', 'sst', '2025-08-27 00:00:00', 0, 'BHD', 'amount', '500', '', 1),
(97, 5, 'Quotation', '57809653', '2025-06-01 00:00:00', '2025-06-30 00:00:00', 20, '1', 250000.00, 0, '', NULL, 1, 0, 0, 0, '2025-09-16 02:48:03', '2025-10-18 11:29:37', 1, NULL, NULL, NULL, 0, 0, '11D', '', '', NULL, 0, 'MYR', '', '', '', 1),
(98, 5, 'Invoice', '38503154', '2025-07-01 00:00:00', '2025-07-31 00:00:00', 20, '1', 250000.00, 0, '', NULL, 1, 0, 0, 0, '2025-09-16 02:52:20', '2025-11-16 12:14:22', 0, NULL, NULL, NULL, 0, 0, '11D', '', '', NULL, 0, 'MYR', '', '', '', 0),
(99, 5, 'Invoice', '73893163', '2026-08-01 00:00:00', '2026-08-31 00:00:00', 18, '1', 440.00, 1, '', NULL, 1, 0, 0, 0, '2025-09-20 02:59:18', '2025-09-20 02:59:18', 0, 'yearly', '2026-08-01', '2027-08-01', 2, 0, '11D', '', '', '2026-08-01 00:00:00', 0, 'MYR', '', '', 'Yearly Renewal of Hosting and Domain', 0),
(100, 1, 'Invoice', '91188231', '2025-10-02 00:00:00', '2025-10-07 00:00:00', 1, '1', 374.00, 0, NULL, NULL, 1, 0, NULL, NULL, '2025-09-30 02:16:11', '2025-09-30 02:26:20', 0, NULL, NULL, NULL, 0, 0, '11SS', '', '', NULL, 0, 'AUD', '', '', '', 0),
(101, 10, 'Invoice', '21018663', '2025-09-04 00:00:00', '2025-10-30 00:00:00', 21, '1', 37000.00, 0, '', NULL, 1, 0, 0, 0, '2025-10-04 04:18:57', '2025-10-14 09:01:47', 0, NULL, NULL, NULL, 0, 0, 'PM', '', '', NULL, 0, 'MYR', '', '', '', 1),
(102, 1, 'Invoice', '49081505', '2025-11-02 00:00:00', '2025-11-10 00:00:00', 1, '1', 275.00, 0, NULL, NULL, 1, 0, NULL, NULL, '2025-11-05 01:12:59', '2025-11-05 01:14:33', 2, NULL, NULL, NULL, 0, 0, '11SS', '', '', NULL, 0, 'AUD', '', '', '', 0),
(103, 10, 'Invoice', '46370891', '2025-11-19 00:00:00', '2025-11-25 00:00:00', 21, '1', 25000.00, 0, '', NULL, 1, 0, 0, 0, '2025-11-18 02:43:04', '2026-04-15 10:14:50', 0, '', '0000-00-00', '0000-00-00', 0, 0, 'PM', '', '', NULL, 0, 'MYR', '', '', '', 1),
(104, 5, 'Invoice', '47348233', '2025-08-08 00:00:00', '2025-12-31 00:00:00', 20, '1', 40000.00, 0, '', NULL, 1, 0, 0, 0, '2025-11-21 07:06:21', '2026-04-15 10:14:52', 1, '', '0000-00-00', '0000-00-00', 0, 0, '11D', '', '', NULL, 0, 'MYR', '', '', '', 1),
(105, 1, 'Invoice', '50708825', '2025-12-01 00:00:00', '2025-12-10 00:00:00', 1, '1', 275.00, 0, NULL, NULL, 1, 0, NULL, NULL, '2025-12-01 04:10:10', '2025-12-01 04:10:32', 2, NULL, NULL, NULL, 0, 0, '11SS', '', '', NULL, 0, 'AUD', '', '', '', 0),
(106, 5, 'Invoice', '49321762', '2025-12-10 00:00:00', '2025-12-17 00:00:00', 22, '1', 960.00, 1, '', NULL, 1, 0, 0, 0, '2025-12-10 08:05:22', '2026-01-16 03:37:58', 1, 'yearly', '2027-01-01', '2028-12-10', 3, 0, '11D', '', '', '2028-01-01 00:00:00', 1, 'MYR', 'amount', '60', 'Discounted RM60 since it\'s an annual payment', 0),
(107, 13, 'Invoice', '78161101', '2025-12-12 00:00:00', '2025-12-16 00:00:00', 24, '1', 10000.00, 0, '', NULL, 1, 1, 0, 0, '2025-12-12 02:35:01', '2025-12-17 03:43:08', 0, NULL, NULL, NULL, 0, 0, 'RG', '', '', NULL, 0, 'MYR', '', '', '', 1),
(108, 12, 'Invoice', '68380099', '2025-12-12 00:00:00', '2025-12-16 00:00:00', 23, '1', 10000.00, 0, '', NULL, 1, 1, 0, 0, '2025-12-12 02:38:24', '2025-12-17 03:41:52', 1, '', '0000-00-00', '0000-00-00', 0, 0, 'K', '', '', NULL, 0, 'MYR', '', '', '', 0),
(109, 11, 'Invoice', '72973684', '2025-12-12 00:00:00', '2025-12-16 00:00:00', 25, '1', 10000.00, 0, '', NULL, 1, 1, 0, 0, '2025-12-12 02:41:30', '2025-12-17 03:41:57', 2, '', '0000-00-00', '0000-00-00', 0, 0, 'GV', '', '', NULL, 0, 'MYR', '', '', '', 0),
(110, 1, 'Invoice', '70807317', '2025-12-31 00:00:00', '2026-01-07 00:00:00', 1, '1', 710.00, 0, NULL, NULL, 1, 0, NULL, NULL, '2025-12-31 11:58:15', '2025-12-31 12:07:06', 2, NULL, NULL, NULL, 0, 0, '11SS', '', '', NULL, 0, 'AUD', '', '', '', 0),
(111, 5, 'Invoice', '20189623', '2026-01-02 00:00:00', '2026-01-09 00:00:00', 14, '1', 560.00, 0, NULL, NULL, 1, 0, NULL, NULL, '2026-01-02 02:59:24', '2026-01-02 03:04:57', 0, NULL, NULL, NULL, 0, 0, '11D', '', '', NULL, 0, 'MYR', '', '', 'Yearly Renewal ', 0),
(112, 5, 'Invoice', '57592676', '2026-01-02 00:00:00', '2026-01-09 00:00:00', 18, '1', 2040.00, 1, '', NULL, 1, 0, 0, 0, '2026-01-02 04:10:25', '2026-01-02 04:19:37', 2, 'yearly', '2026-01-01', '2030-01-01', 4, 0, '11D', '', '', '2027-01-01 00:00:00', 1, 'MYR', 'amount', '120', 'Yearly services, Discount of RM10.00 per month', 0),
(113, 5, 'Invoice', '52839760', '2026-01-02 00:00:00', '2026-01-09 00:00:00', 18, '1', 2040.00, 0, NULL, NULL, 1, 0, NULL, NULL, '2026-01-02 04:14:22', '2026-01-02 04:23:23', 2, NULL, NULL, NULL, 0, 0, '11D', '', '', NULL, 0, 'MYR', 'amount', '120', 'Yearly services, Discount of RM10.00 per month', 0),
(114, 1, 'Invoice', '70445084', '2026-05-01 00:00:00', '2026-05-07 00:00:00', 26, '1', 560.00, 1, '', NULL, 1, 0, 0, 0, '2026-01-07 03:38:16', '2026-04-14 01:48:45', 0, 'yearly', '2026-05-01', '2030-05-01', 5, 0, '11SS', '', '', '2027-05-01 00:00:00', 1, 'AUD', '', '', '1st May 2026-2025', 0),
(115, 10, 'Invoice', '58944805', '2026-01-08 00:00:00', '2026-01-16 00:00:00', 21, '1', 30000.00, 0, '', NULL, 1, 0, 0, 0, '2026-01-11 03:22:29', '2026-04-15 10:14:54', 0, '', '0000-00-00', '0000-00-00', 0, 0, 'PM', '', '', NULL, 0, 'MYR', '', '', '', 1),
(116, 5, 'Invoice', '60673818', '2026-01-01 00:00:00', '2026-01-10 00:00:00', 22, '1', 960.00, 0, NULL, NULL, 1, 0, NULL, NULL, '2026-01-16 03:37:57', '2026-01-16 03:37:57', 1, NULL, NULL, NULL, 3, 0, '11D', '', '', NULL, 0, 'MYR', 'amount', '60', 'Discounted RM60 since it\'s an annual payment', 0),
(117, 1, 'Invoice', '96770701', '2026-02-03 00:00:00', '2026-02-10 00:00:00', 8, '1', 1380.00, 0, '', NULL, 1, 0, 0, 0, '2026-02-03 02:45:37', '2026-02-03 02:49:44', 0, NULL, NULL, NULL, 0, 0, '11SS', '', '', NULL, 0, 'AUD', '', '', '', 0),
(118, 10, 'Invoice', '89133365', '2026-03-04 00:00:00', '2026-03-12 00:00:00', 21, '1', 15000.00, 0, '', NULL, 1, 0, 0, 0, '2026-03-05 01:20:08', '2026-04-15 10:14:56', 1, '', '0000-00-00', '0000-00-00', 0, 0, 'PM', '', '', NULL, 0, 'MYR', '', '', '', 1),
(119, 1, 'Invoice', '41530526', '2026-04-02 00:00:00', '2026-04-09 00:00:00', 1, '1', 275.00, 0, NULL, NULL, 1, 1, NULL, NULL, '2026-04-02 04:16:45', '2026-04-02 04:17:15', 2, NULL, NULL, NULL, 7, 0, '11SS', '', '', NULL, 0, 'AUD', '', '', '', 0),
(120, 1, 'Invoice', '24917156', '2026-04-02 00:00:00', '2026-04-15 00:00:00', 1, '1', 160.00, 0, '', NULL, 1, 0, 0, 0, '2026-04-02 04:22:58', '2026-04-15 10:14:24', 0, NULL, NULL, NULL, 0, 0, '11SS', '', '', NULL, 0, 'AUD', '', '', '', 0),
(121, 1, 'Invoice', '25626581', '2026-04-14 00:00:00', '2026-04-21 00:00:00', 26, '1', 560.00, 0, NULL, NULL, 1, 0, NULL, NULL, '2026-04-14 01:48:45', '2026-04-14 01:51:31', 0, NULL, NULL, NULL, 0, 0, '11SS', '', '', NULL, 0, 'AUD', '', '', '1st May 2026-2025', 0),
(122, 1, 'Invoice', '90237529', '2026-04-15 00:00:00', '2026-04-22 00:00:00', 26, '1', 850.00, 0, '', NULL, 1, 0, 0, 0, '2026-04-15 10:05:23', '2026-04-15 10:05:23', 0, '', '0000-00-00', '0000-00-00', 0, 0, '11SS', '', '', NULL, 0, 'AUD', '', '', '', 0),
(123, 1, 'Invoice', '24252698', '2026-05-19 00:00:00', '2026-06-10 00:00:00', 7, '1', 280.00, 0, NULL, NULL, 1, 0, NULL, NULL, '2026-05-19 04:23:37', '2026-05-19 04:25:24', 1, NULL, NULL, NULL, 0, 0, '11SS', '', '', NULL, 0, 'AUD', '', '', NULL, 0),
(124, 1, 'Invoice', '84991830', '2026-05-22 00:00:00', '2026-05-29 00:00:00', 24, '1', 50000.00, 0, '', NULL, 1, 0, 0, 0, '2026-05-22 12:23:38', '2026-05-22 12:23:38', 0, '', '0000-00-00', '0000-00-00', 0, 0, '11SS', '', '', NULL, 0, 'MYR', '', '', '', 0),
(125, 13, 'Invoice', '49000682', '2026-05-26 00:00:00', '2026-06-02 00:00:00', 29, '1', 1980.00, 0, '', NULL, 1, 0, 0, 0, '2026-05-26 03:28:35', '2026-05-31 14:18:45', 2, NULL, NULL, NULL, 0, 0, 'RG', '', '', NULL, 0, 'MYR', '', '', '', 0);

-- --------------------------------------------------------

--
-- Table structure for table `invoice_items`
--

CREATE TABLE `invoice_items` (
  `item_id` int NOT NULL,
  `invoice_id` int NOT NULL,
  `product_id` int DEFAULT NULL,
  `description` varchar(255) DEFAULT NULL,
  `quantity` int DEFAULT NULL,
  `unit_price` decimal(10,2) NOT NULL,
  `total_price` decimal(10,2) NOT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `is_deleted` tinyint(1) NOT NULL DEFAULT '0',
  `created_by` int DEFAULT NULL,
  `modified_by` int DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `product_name` text NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

--
-- Dumping data for table `invoice_items`
--

INSERT INTO `invoice_items` (`item_id`, `invoice_id`, `product_id`, `description`, `quantity`, `unit_price`, `total_price`, `is_active`, `is_deleted`, `created_by`, `modified_by`, `createdAt`, `updatedAt`, `product_name`) VALUES
(186, 6, 2, 'HX55 Fiber Port Connector', 10, 110.00, 1100.00, 1, 0, NULL, NULL, '2025-05-29 06:39:18', '2025-05-29 06:39:18', ''),
(187, 6, 1, 'Cat 6E LAN Cable. New Gen Electromagnetic free cable', 5, 55.00, 275.00, 1, 0, NULL, NULL, '2025-05-29 06:39:18', '2025-05-29 06:39:18', ''),
(1336, 10, 3, 'Test', 6, 250.00, 1500.00, 1, 0, NULL, NULL, '2025-06-10 09:02:03', '2025-06-10 09:02:03', ''),
(1337, 10, 1, 'Cat 6E LAN Cable. New Gen Electromagnetic free cable', 4, 55.35, 221.40, 1, 0, NULL, NULL, '2025-06-10 09:02:03', '2025-06-10 09:02:03', ''),
(1388, 3, 1, 'Cat 6E LAN Cable. New Gen Electromagnetic free cable', 8, 55.00, 440.00, 1, 0, NULL, NULL, '2025-06-10 12:10:32', '2025-06-10 12:10:32', ''),
(1389, 3, 1, 'Cat 6E LAN Cable. New Gen Electromagnetic free cable', 17, 55.00, 935.00, 1, 0, NULL, NULL, '2025-06-10 12:10:32', '2025-06-10 12:10:32', ''),
(1390, 11, 2, 'HX55 Fiber Port Connector', 8, 110.00, 880.00, 1, 0, NULL, NULL, '2025-06-13 10:42:57', '2025-06-13 10:42:57', ''),
(1391, 11, 1, 'Cat 6E LAN Cable. New Gen Electromagnetic free cable', 5, 55.35, 276.75, 1, 0, NULL, NULL, '2025-06-13 10:42:57', '2025-06-13 10:42:57', ''),
(1506, 16, 4, 'Maxia Group Web Hosting Renewal ', 1, 280.00, 280.00, 1, 0, NULL, NULL, '2025-06-20 01:07:15', '2025-07-08 03:24:45', ''),
(1507, 19, 1, 'Cat 6E LAN Cable. New Gen Electromagnetic free cable', 6, 55.35, 332.10, 1, 0, NULL, NULL, '2025-06-21 05:51:45', '2025-06-21 05:51:45', ''),
(1508, 18, 5, 'Fixed the error on the salary slip generator. We disable the button till an interpreter name is added. Changed the interpreter field to mandatory', 1, 350.00, 350.00, 1, 0, NULL, NULL, '2025-06-22 04:57:25', '2025-06-22 04:57:25', ''),
(1540, 29, 2, 'HX55 Fiber Port Connector', 5, 110.00, 550.00, 1, 0, NULL, NULL, '2025-06-25 11:14:25', '2025-06-25 11:14:25', ''),
(1541, 29, 1, 'Cat 6E LAN Cable. New Gen Electromagnetic free cable', 8, 55.35, 442.80, 1, 0, NULL, NULL, '2025-06-25 11:14:25', '2025-06-25 11:14:25', ''),
(1542, 30, 2, 'HX55 Fiber Port Connector', 5, 110.00, 550.00, 1, 0, NULL, NULL, '2025-06-25 11:22:52', '2025-06-25 11:22:52', ''),
(1543, 30, 1, 'Cat 6E LAN Cable. New Gen Electromagnetic free cable', 8, 55.35, 442.80, 1, 0, NULL, NULL, '2025-06-25 11:22:52', '2025-06-25 11:22:52', ''),
(1548, 33, 2, 'HX55 Fiber Port Connector', 5, 110.00, 550.00, 1, 0, NULL, NULL, '2025-06-25 12:34:02', '2025-06-25 12:34:02', ''),
(1549, 33, 1, 'Cat 6E LAN Cable. New Gen Electromagnetic free cable', 8, 55.35, 442.80, 1, 0, NULL, NULL, '2025-06-25 12:34:02', '2025-06-25 12:34:02', ''),
(1550, 34, 2, 'HX55 Fiber Port Connector', 5, 110.00, 550.00, 1, 0, NULL, NULL, '2025-06-25 12:40:13', '2025-06-25 12:40:13', ''),
(1551, 34, 1, 'Cat 6E LAN Cable. New Gen Electromagnetic free cable', 8, 55.35, 442.80, 1, 0, NULL, NULL, '2025-06-25 12:40:13', '2025-06-25 12:40:13', ''),
(1627, 37, 2, 'HX55 Fiber Port Connector', 8, 110.00, 880.00, 1, 0, NULL, NULL, '2025-06-26 05:17:15', '2025-07-02 05:40:38', ''),
(1628, 37, 1, 'Cat 6E LAN Cable. New Gen Electromagnetic free cable', 5, 55.35, 276.75, 1, 0, NULL, NULL, '2025-06-26 05:17:15', '2025-07-02 05:40:38', ''),
(1629, 38, 2, 'HX55 Fiber Port Connector', 8, 110.00, 880.00, 1, 0, NULL, NULL, '2025-06-26 05:22:02', '2025-06-26 05:22:02', ''),
(1630, 38, 1, 'Cat 6E LAN Cable. New Gen Electromagnetic free cable', 5, 55.35, 276.75, 1, 0, NULL, NULL, '2025-06-26 05:22:02', '2025-06-26 05:22:02', ''),
(1631, 39, 2, 'HX55 Fiber Port Connector', 8, 110.00, 880.00, 1, 0, NULL, NULL, '2025-06-26 05:26:06', '2025-06-26 05:26:06', ''),
(1632, 39, 1, 'Cat 6E LAN Cable. New Gen Electromagnetic free cable', 5, 55.35, 276.75, 1, 0, NULL, NULL, '2025-06-26 05:26:06', '2025-06-26 05:26:06', ''),
(1633, 40, 2, 'HX55 Fiber Port Connector', 8, 110.00, 880.00, 1, 0, NULL, NULL, '2025-06-26 05:28:54', '2025-06-26 05:28:54', ''),
(1634, 40, 1, 'Cat 6E LAN Cable. New Gen Electromagnetic free cable', 5, 55.35, 276.75, 1, 0, NULL, NULL, '2025-06-26 05:28:54', '2025-06-26 05:28:54', ''),
(1663, 43, 2, 'HX55 Fiber Port Connector', 5, 110.00, 550.00, 1, 0, NULL, NULL, '2025-06-26 05:49:59', '2025-06-26 05:49:59', ''),
(1664, 43, 1, 'Cat 6E LAN Cable. New Gen Electromagnetic free cable', 8, 55.35, 442.80, 1, 0, NULL, NULL, '2025-06-26 05:49:59', '2025-06-26 05:49:59', ''),
(1695, 47, 1, 'Cat 6E LAN Cable. New Gen Electromagnetic free cable', 8, 55.00, 440.00, 1, 0, NULL, NULL, '2025-06-26 06:00:57', '2025-06-26 06:00:57', ''),
(1696, 47, 1, 'Cat 6E LAN Cable. New Gen Electromagnetic free cable', 17, 55.00, 935.00, 1, 0, NULL, NULL, '2025-06-26 06:00:57', '2025-06-26 06:00:57', ''),
(1722, 49, 2, 'HX55 Fiber Port Connector', 5, 110.00, 550.00, 1, 0, NULL, NULL, '2025-06-26 06:05:32', '2025-06-26 06:05:32', ''),
(1723, 49, 1, 'Cat 6E LAN Cable. New Gen Electromagnetic free cable', 8, 55.35, 442.80, 1, 0, NULL, NULL, '2025-06-26 06:05:32', '2025-06-26 06:05:32', ''),
(1724, 50, 3, 'Test', 8, 250.00, 2000.00, 1, 0, NULL, NULL, '2025-06-27 05:13:56', '2025-06-27 05:13:56', ''),
(1725, 50, 1, 'Cat 6E LAN Cable. New Gen Electromagnetic free cable', 5, 55.35, 276.75, 1, 0, NULL, NULL, '2025-06-27 05:13:56', '2025-06-27 05:13:56', ''),
(1726, 51, 4, 'Maxia Group Web Hosting Renewal ', 10, 280.00, 2800.00, 1, 0, NULL, NULL, '2025-06-27 05:15:03', '2025-06-27 05:15:03', ''),
(1727, 51, 2, 'HX55 Fiber Port Connector', 8, 110.00, 880.00, 1, 0, NULL, NULL, '2025-06-27 05:15:03', '2025-06-27 05:15:03', ''),
(1730, 52, 7, 'Quarterly Web Hosting', 1, 99.00, 99.00, 1, 0, NULL, NULL, '2025-07-01 02:30:11', '2025-07-01 02:30:11', ''),
(1731, 52, 6, 'Standard Web Maintenance & SMO', 1, 275.00, 275.00, 1, 0, NULL, NULL, '2025-07-01 02:30:11', '2025-07-01 02:30:11', ''),
(1732, 53, NULL, 'This is a very good monitor', 10, 1000.00, 10000.00, 1, 0, NULL, NULL, '2025-07-01 12:28:49', '2025-07-01 13:31:05', 'Monitor'),
(1733, 53, NULL, 'Cat 6E LAN Cable. New Gen Electromagnetic free cable', 10, 55.35, 553.50, 1, 0, NULL, NULL, '2025-07-01 12:28:49', '2025-07-01 13:31:05', 'RJ 45 LAN Cables'),
(1734, 54, NULL, 'Cat 6E LAN Cable. New Gen Electromagnetic free cable', 10, 55.35, 553.50, 1, 0, NULL, NULL, '2025-07-02 05:19:36', '2025-07-02 05:54:29', 'RJ 45 LAN Cables'),
(1735, 54, NULL, 'A monitor is an output device that displays visuals from a computer', 10, 1000.00, 10000.00, 1, 0, NULL, NULL, '2025-07-02 05:19:36', '2025-07-02 05:54:29', 'Monitor'),
(1736, 54, NULL, 'Cat 6E LAN Cable. New Gen Electromagnetic free cable', 10, 55.35, 553.50, 1, 0, NULL, NULL, '2025-07-02 05:53:38', '2025-07-02 05:54:29', 'RJ 45 LAN Cables'),
(1737, 55, NULL, 'HX55 Fiber Port Connector', 100, 110.00, 11000.00, 1, 0, NULL, NULL, '2025-07-02 09:06:41', '2025-07-02 12:52:24', 'HX 55'),
(1738, 55, NULL, 'It\'s an LG monitor', 10, 1000.00, 10000.00, 1, 0, NULL, NULL, '2025-07-02 09:06:41', '2025-07-02 12:52:24', 'Monitor'),
(1739, 56, 2, 'HX55 Fiber Port Connector', 8, 110.00, 880.00, 1, 0, NULL, NULL, '2025-07-02 09:18:41', '2025-07-03 07:58:10', ''),
(1740, 56, 1, 'Cat 6E LAN Cable. New Gen Electromagnetic free cable', 5, 55.35, 276.75, 1, 0, NULL, NULL, '2025-07-02 09:18:41', '2025-07-03 07:58:10', ''),
(1741, 57, NULL, 'Cat 6E LAN Cable. New Gen Electromagnetic free cable', 5, 5000.00, 25000.00, 1, 0, NULL, NULL, '2025-07-02 12:49:43', '2025-07-03 08:08:18', 'mouse'),
(1742, 58, 0, '', 1, 320.00, 320.00, 1, 0, NULL, NULL, '2025-07-08 03:33:35', '2025-07-08 03:33:35', 'HOSTING WITH 15 EMAILS'),
(1743, 58, 0, '', 1, 120.00, 120.00, 1, 0, NULL, NULL, '2025-07-08 03:33:35', '2025-07-08 03:33:35', 'DOMAIN METADMS.COM, NEXT RENEWAL 30 JAN 2026'),
(1744, 58, 0, 'DOMAIN OSHTRAINERS.COM PER YEAR, NEXT RENEWAL 30 JAN 2026', 1, 120.00, 120.00, 1, 0, NULL, NULL, '2025-07-08 03:33:35', '2025-07-08 03:33:35', 'Web Hosting From Jan 2025- Jan 2026'),
(1745, 59, NULL, 'Website Design and 1 year Hosting ( 5 email ID included)', 1, 1420.00, 1420.00, 1, 0, NULL, NULL, '2025-07-10 09:59:42', '2025-08-31 03:20:02', 'Website Design and Hosting'),
(1776, 84, 0, 'Staff Edit Function - Disable Staff agency change after a Job is already created. access only for Admin ', 1, 0.00, 0.00, 1, 0, NULL, NULL, '2025-07-31 02:57:57', '2025-07-31 02:57:57', 'New Change Request'),
(1777, 84, 0, 'Interpreter Module - Disable the finish time column', 1, 0.00, 0.00, 1, 0, NULL, NULL, '2025-07-31 02:57:57', '2025-07-31 02:57:57', 'New Change Request'),
(1778, 84, 0, ' Payslip generator - Generate PDF and Excel report using specific date range', 1, 880.00, 880.00, 1, 0, NULL, NULL, '2025-07-31 02:57:57', '2025-07-31 02:57:57', 'New Change Request'),
(1779, 85, NULL, 'Standard Web Maintenance & SMO', 1, 275.00, 275.00, 1, 0, NULL, NULL, '2025-08-02 04:02:05', '2025-08-25 09:50:07', 'Standard Web Maintenance & SMO'),
(1784, 90, NULL, '5 Page Web Design, New Hosting and Domain, inclusive Full featured Booking Application ', 1, 3000.00, 3000.00, 1, 0, NULL, NULL, '2025-08-20 00:51:20', '2025-08-20 01:00:13', 'Gym Website, Hosting, Domain and Booking Application'),
(1785, 91, 0, 'Cat 6E LAN Cable. New Gen Electromagnetic free cable', 20, 55.35, 1107.00, 1, 0, NULL, NULL, '2025-08-25 06:46:43', '2025-08-25 06:46:43', 'RJ 45 LAN Cables'),
(1788, 94, 0, 'Standard Web Maintenance & SMO', 1, 275.00, 275.00, 1, 0, NULL, NULL, '2025-08-25 09:58:42', '2025-08-25 09:58:42', 'Standard Web Maintenance & SMO'),
(1789, 95, 0, 'Standard Web Maintenance & SMO', 1, 275.00, 275.00, 1, 0, NULL, NULL, '2025-08-26 12:31:49', '2025-09-01 02:14:36', ''),
(1791, 97, NULL, 'Developing BAT TX System ', 1, 250000.00, 250000.00, 1, 0, NULL, NULL, '2025-09-16 02:48:03', '2025-10-18 11:25:25', 'Developing BAT TX System '),
(1792, 98, NULL, 'Development of BAT TX System', 1, 250000.00, 250000.00, 1, 0, NULL, NULL, '2025-09-16 02:52:20', '2025-11-16 12:14:23', 'Development of BAT TX System'),
(1793, 99, 0, 'Domain Renewal', 1, 120.00, 120.00, 1, 0, NULL, NULL, '2025-09-20 02:59:18', '2025-09-20 02:59:18', 'Domain'),
(1794, 99, 0, 'Web Hosting Metaxfitness', 1, 320.00, 320.00, 1, 0, NULL, NULL, '2025-09-20 02:59:18', '2025-09-20 02:59:18', 'Web Hosting'),
(1795, 100, NULL, 'Standard Web Maintenance & SMO', 1, 275.00, 275.00, 1, 0, NULL, NULL, '2025-09-30 02:16:11', '2025-09-30 02:26:20', 'Standard Web Maintenance & SMO'),
(1796, 100, NULL, 'WebHosting Sept 2025- Nov 2025', 1, 99.00, 99.00, 1, 0, NULL, NULL, '2025-09-30 02:20:57', '2025-09-30 02:26:20', 'WebHosting Oct 2025- Dec 2025'),
(1797, 101, NULL, 'Consultancy Services', 1, 37000.00, 37000.00, 1, 0, NULL, NULL, '2025-10-04 04:18:57', '2025-10-04 04:20:21', 'Consultancy Services'),
(1798, 102, 0, 'Standard Web Maintenance & SMO', 1, 275.00, 275.00, 1, 0, NULL, NULL, '2025-11-05 01:12:59', '2025-11-05 01:14:33', ''),
(1799, 103, 0, 'Consultancy Services', 1, 25000.00, 25000.00, 1, 0, NULL, NULL, '2025-11-18 02:43:05', '2025-11-18 02:43:05', 'Consultancy Services'),
(1800, 104, 0, 'Development of BAT TX System', 1, 40000.00, 40000.00, 1, 0, NULL, NULL, '2025-11-21 07:06:21', '2025-11-21 07:06:21', 'Development of BAT TX System'),
(1801, 105, 0, 'Standard Web Maintenance & SMO', 1, 275.00, 275.00, 1, 0, NULL, NULL, '2025-12-01 04:10:10', '2025-12-01 04:10:32', ''),
(1802, 106, NULL, 'System includes 12 months Standard Support and 100GB Storage.', 1, 960.00, 960.00, 1, 0, NULL, NULL, '2025-12-10 08:05:22', '2025-12-10 09:31:43', 'Annual LOMS System Usage From Jan 2026- Dec 2026'),
(1806, 110, NULL, 'Standard Web Maintenance & SMO', 1, 275.00, 275.00, 1, 0, NULL, NULL, '2025-12-31 11:58:16', '2025-12-31 12:07:06', 'Standard Web Maintenance & SMO'),
(1807, 110, NULL, 'Pending Invoice 11SS50708825 for month of November', 1, 275.00, 275.00, 1, 0, NULL, NULL, '2025-12-31 12:03:24', '2025-12-31 12:07:06', 'Pending Invoice 11SS50708825'),
(1808, 110, NULL, 'Hosting Server for Website and DDS system', 4, 40.00, 160.00, 1, 0, NULL, NULL, '2025-12-31 12:05:13', '2025-12-31 12:07:06', 'Hosting Server Jan - April 2026'),
(1809, 111, NULL, '', 1, 320.00, 320.00, 1, 0, NULL, NULL, '2026-01-02 02:59:25', '2026-01-02 03:04:57', 'HOSTING WITH 15 EMAILS'),
(1810, 111, NULL, '', 1, 120.00, 120.00, 1, 0, NULL, NULL, '2026-01-02 02:59:25', '2026-01-02 03:04:57', 'DOMAIN METADMS.COM, NEXT RENEWAL 30 JAN 2026'),
(1811, 111, NULL, 'DOMAIN OSHTRAINERS.COM PER YEAR, NEXT RENEWAL 30 JAN 2026', 1, 120.00, 120.00, 1, 0, NULL, NULL, '2026-01-02 02:59:25', '2026-01-02 03:04:57', 'DOMAIN OSHTRAINERS.COM PER YEAR, NEXT RENEWAL 30 JAN 2026'),
(1812, 112, NULL, 'GYM System Server and Maintenance Annually', 12, 170.00, 2040.00, 1, 0, NULL, NULL, '2026-01-02 04:10:25', '2026-01-02 04:19:37', 'GYM System Server and Maintenance Annually'),
(1813, 113, NULL, '', 12, 170.00, 2040.00, 1, 0, NULL, NULL, '2026-01-02 04:14:22', '2026-01-02 04:23:23', 'GYM System Software and Maintenance Annually'),
(1814, 114, 0, 'Web/ Email hosting and Maintenance', 2, 280.00, 560.00, 1, 0, NULL, NULL, '2026-01-07 03:38:16', '2026-01-07 03:38:16', 'Milan Trade / Quantam Pacific Engineering'),
(1815, 115, 0, 'Consultancy services', 1, 30000.00, 30000.00, 1, 0, NULL, NULL, '2026-01-11 03:22:29', '2026-01-11 03:22:29', 'Consultancy Services '),
(1816, 116, 0, 'System includes 12 months Standard Support and 100GB Storage.', 1, 960.00, 960.00, 1, 0, NULL, NULL, '2026-01-16 03:37:57', '2026-01-16 03:37:57', ''),
(1817, 117, NULL, 'Created a new Set of dataset for interpreter and agency table. Added new algorithm and logic on all tables', 1, 1380.00, 1380.00, 1, 0, NULL, NULL, '2026-02-03 02:45:37', '2026-02-03 02:49:44', 'New Change and Logic For WA Booking System'),
(1818, 118, 0, 'Consultancy services', 1, 15000.00, 15000.00, 1, 0, NULL, NULL, '2026-03-05 01:20:08', '2026-03-05 01:20:08', 'Consultancy Services'),
(1820, 120, NULL, 'Web Hosting from May - August 2026', 4, 40.00, 160.00, 1, 0, NULL, NULL, '2026-04-02 04:22:58', '2026-04-15 10:14:24', 'Web Hosting from May - August 2026'),
(1821, 121, NULL, 'Web/ Email hosting and Maintenance', 2, 280.00, 560.00, 1, 0, NULL, NULL, '2026-04-14 01:48:45', '2026-04-14 01:51:31', 'Quantam Pacific Eng & Milan trade co'),
(1822, 122, 0, 'Professional Web Design And Hosting for Tambwe', 1, 850.00, 850.00, 1, 0, NULL, NULL, '2026-04-15 10:05:23', '2026-04-15 10:05:23', 'Professional Web Design And Hosting'),
(1823, 123, 0, 'Maxia Group Web Hosting Renewal ', 1, 280.00, 280.00, 1, 0, NULL, NULL, '2026-05-19 04:23:37', '2026-05-19 04:25:24', ''),
(1824, 124, 0, 'Development of BAT TX System', 1, 50000.00, 50000.00, 1, 0, NULL, NULL, '2026-05-22 12:23:38', '2026-05-22 12:23:38', 'Development of BAT TX System'),
(1825, 125, NULL, 'Arpro Website Revamp, and computer upgrade', 1, 1980.00, 1980.00, 1, 0, NULL, NULL, '2026-05-26 03:28:35', '2026-05-31 14:18:45', 'Web Revamp ');

-- --------------------------------------------------------

--
-- Table structure for table `lookups`
--

CREATE TABLE `lookups` (
  `lookup_id` int NOT NULL,
  `lookup_name` varchar(255) DEFAULT NULL,
  `lookup_value` varchar(255) DEFAULT NULL,
  `lookup_type` varchar(255) DEFAULT NULL,
  `lookup_sub_type` varchar(255) DEFAULT NULL,
  `lookup_icon` varchar(255) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `is_deleted` tinyint(1) DEFAULT '0',
  `created_by` int DEFAULT '1',
  `modified_by` int DEFAULT '1',
  `sort_by_type` int DEFAULT '0',
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

--
-- Dumping data for table `lookups`
--

INSERT INTO `lookups` (`lookup_id`, `lookup_name`, `lookup_value`, `lookup_type`, `lookup_sub_type`, `lookup_icon`, `is_active`, `is_deleted`, `created_by`, `modified_by`, `sort_by_type`, `createdAt`, `updatedAt`) VALUES
(1, 'Admin', '0', 'usertype', 'usertype', '', 1, 0, 1, 1, 0, '2025-01-25 05:04:50', '2025-01-25 05:04:50'),
(2, 'Manager', '1', 'usertype', 'usertype', '', 1, 0, 1, 1, 0, '2025-01-25 05:04:52', '2025-01-25 05:04:52'),
(3, 'Staff', '2', 'usertype', 'usertype', '', 1, 0, 1, 1, 0, '2025-01-25 05:04:53', '2025-01-25 05:04:53'),
(5, 'Invoice', 'Invoice', 'invoice_type', 'invoice_type', '', 1, 0, 0, 0, 0, '2025-01-25 06:29:55', '2025-01-25 06:29:55'),
(6, 'Quotation', 'Quotation', 'invoice_type', 'invoice_type', '', 1, 0, 0, 0, 0, '2025-01-25 06:30:37', '2025-01-25 06:30:37'),
(7, 'Cash', 'cash', 'payment_method', 'payment_method', '', 1, 0, 0, 0, 0, '2025-01-25 07:38:39', '2025-01-25 07:38:39'),
(12, 'Credit Card', 'Credit Card', 'payment_method', 'payment_method', '', 1, 0, 0, 0, 0, '2025-02-08 05:25:20', '2025-02-08 05:25:20'),
(14, 'Online Banking ', 'Online Banking ', 'payment_method', 'payment_method', '', 1, 0, 0, 0, 0, '2025-02-08 05:25:55', '2025-02-14 06:14:36'),
(17, 'Purchase Order', 'Purchase Order', 'invoice_type', 'invoice_type', '', 1, 0, 0, 0, 0, '2025-06-23 02:15:28', '2025-06-23 02:15:28');

-- --------------------------------------------------------

--
-- Table structure for table `menu_lists`
--

CREATE TABLE `menu_lists` (
  `id` int NOT NULL,
  `menu_id` int NOT NULL,
  `user_id` int NOT NULL,
  `create` tinyint(1) NOT NULL,
  `read` tinyint(1) NOT NULL,
  `updates` tinyint(1) NOT NULL,
  `delete` tinyint(1) NOT NULL,
  `is_active` tinyint(1) NOT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

--
-- Dumping data for table `menu_lists`
--

INSERT INTO `menu_lists` (`id`, `menu_id`, `user_id`, `create`, `read`, `updates`, `delete`, `is_active`, `createdAt`, `updatedAt`) VALUES
(837, 1, 22, 1, 1, 1, 1, 1, '2025-02-19 10:14:13', '2025-02-19 10:14:13'),
(838, 2, 22, 1, 1, 1, 1, 1, '2025-02-19 10:14:13', '2025-02-19 10:14:13'),
(839, 3, 22, 1, 1, 1, 1, 1, '2025-02-19 10:14:13', '2025-02-19 10:14:13'),
(840, 4, 22, 1, 1, 1, 1, 1, '2025-02-19 10:14:13', '2025-02-19 10:14:13'),
(841, 5, 22, 1, 1, 1, 1, 1, '2025-02-19 10:14:13', '2025-02-19 10:14:13'),
(842, 6, 22, 1, 1, 1, 1, 1, '2025-02-19 10:14:13', '2025-02-19 10:14:13'),
(843, 7, 22, 1, 1, 1, 1, 1, '2025-02-19 10:14:13', '2025-02-19 10:14:13'),
(844, 8, 22, 1, 1, 1, 1, 1, '2025-02-19 10:14:13', '2025-02-19 10:14:13'),
(845, 9, 22, 1, 1, 1, 1, 1, '2025-02-19 10:14:13', '2025-02-19 10:14:13'),
(846, 10, 22, 1, 1, 1, 1, 1, '2025-02-19 10:14:13', '2025-02-19 10:14:13'),
(847, 11, 22, 1, 1, 1, 1, 1, '2025-02-19 10:14:13', '2025-02-19 10:14:13'),
(861, 2, 18, 1, 1, 1, 1, 1, '2025-02-19 13:06:53', '2025-02-19 13:06:53'),
(862, 3, 18, 1, 1, 1, 1, 1, '2025-02-19 13:06:53', '2025-02-19 13:06:53'),
(863, 2, 23, 1, 1, 0, 1, 1, '2025-02-19 13:13:26', '2025-02-19 13:13:26'),
(1082, 1, 35, 1, 1, 1, 1, 1, '2025-03-20 07:11:24', '2025-03-20 07:11:24'),
(1083, 2, 35, 0, 1, 0, 1, 1, '2025-03-20 07:11:24', '2025-03-20 07:11:24'),
(1084, 3, 35, 1, 1, 1, 1, 1, '2025-03-20 07:11:24', '2025-03-20 07:11:24'),
(1085, 4, 35, 1, 1, 1, 1, 1, '2025-03-20 07:11:24', '2025-03-20 07:11:24'),
(1086, 5, 35, 1, 1, 1, 1, 1, '2025-03-20 07:11:24', '2025-03-20 07:11:24'),
(1087, 6, 35, 1, 1, 1, 1, 1, '2025-03-20 07:11:24', '2025-03-20 07:11:24'),
(1088, 7, 35, 1, 1, 1, 1, 1, '2025-03-20 07:11:24', '2025-03-20 07:11:24'),
(1089, 8, 35, 1, 1, 1, 1, 1, '2025-03-20 07:11:24', '2025-03-20 07:11:24'),
(1090, 9, 35, 1, 1, 1, 1, 1, '2025-03-20 07:11:24', '2025-03-20 07:11:24'),
(1091, 10, 35, 1, 1, 1, 1, 1, '2025-03-20 07:11:24', '2025-03-20 07:11:24'),
(1092, 11, 35, 0, 1, 1, 1, 1, '2025-03-20 07:11:24', '2025-03-20 07:11:24'),
(1093, 1, 2, 1, 1, 1, 1, 1, '2025-03-28 02:05:04', '2025-03-28 02:05:04'),
(1094, 2, 2, 1, 1, 1, 1, 1, '2025-03-28 02:05:04', '2025-03-28 02:05:04'),
(1095, 3, 2, 1, 1, 1, 1, 1, '2025-03-28 02:05:04', '2025-03-28 02:05:04'),
(1096, 4, 2, 1, 1, 1, 1, 1, '2025-03-28 02:05:04', '2025-03-28 02:05:04'),
(1097, 5, 2, 1, 1, 1, 1, 1, '2025-03-28 02:05:04', '2025-03-28 02:05:04'),
(1098, 6, 2, 1, 1, 1, 1, 1, '2025-03-28 02:05:04', '2025-03-28 02:05:04'),
(1099, 7, 2, 1, 1, 1, 1, 1, '2025-03-28 02:05:04', '2025-03-28 02:05:04'),
(1100, 8, 2, 1, 1, 1, 1, 1, '2025-03-28 02:05:04', '2025-03-28 02:05:04'),
(1101, 9, 2, 1, 1, 1, 1, 1, '2025-03-28 02:05:04', '2025-03-28 02:05:04'),
(1102, 10, 2, 1, 1, 1, 1, 1, '2025-03-28 02:05:04', '2025-03-28 02:05:04'),
(1103, 11, 2, 1, 1, 1, 1, 1, '2025-03-28 02:05:04', '2025-03-28 02:05:04'),
(1104, 2, 15, 1, 1, 0, 1, 1, '2025-04-11 11:47:20', '2025-04-11 11:47:20'),
(1105, 1, 15, 1, 1, 0, 1, 1, '2025-04-11 11:47:20', '2025-04-11 11:47:20'),
(1106, 3, 15, 1, 1, 0, 1, 1, '2025-04-11 11:47:20', '2025-04-11 11:47:20'),
(1107, 8, 15, 1, 1, 1, 1, 1, '2025-04-11 11:47:20', '2025-04-11 11:47:20'),
(1108, 9, 15, 1, 1, 1, 1, 1, '2025-04-11 11:47:20', '2025-04-11 11:47:20'),
(1109, 10, 15, 1, 1, 1, 0, 1, '2025-04-11 11:47:20', '2025-04-11 11:47:20'),
(1110, 11, 15, 0, 1, 0, 0, 1, '2025-04-11 11:47:20', '2025-04-11 11:47:20'),
(1111, 1, 17, 1, 1, 1, 1, 1, '2025-04-12 05:24:48', '2025-04-12 05:24:48'),
(1112, 2, 17, 1, 1, 0, 1, 1, '2025-04-12 05:24:48', '2025-04-12 05:24:48'),
(1113, 3, 17, 0, 1, 1, 1, 1, '2025-04-12 05:24:48', '2025-04-12 05:24:48'),
(1114, 4, 17, 0, 1, 1, 0, 1, '2025-04-12 05:24:48', '2025-04-12 05:24:48'),
(1115, 5, 17, 1, 1, 0, 1, 1, '2025-04-12 05:24:48', '2025-04-12 05:24:48'),
(1116, 6, 17, 1, 1, 1, 1, 1, '2025-04-12 05:24:48', '2025-04-12 05:24:48'),
(1117, 7, 17, 1, 1, 0, 1, 1, '2025-04-12 05:24:48', '2025-04-12 05:24:48'),
(1118, 8, 17, 1, 1, 0, 1, 1, '2025-04-12 05:24:48', '2025-04-12 05:24:48'),
(1119, 9, 17, 1, 1, 1, 1, 1, '2025-04-12 05:24:48', '2025-04-12 05:24:48'),
(1120, 10, 17, 1, 1, 1, 1, 1, '2025-04-12 05:24:48', '2025-04-12 05:24:48'),
(1121, 11, 17, 1, 1, 1, 1, 1, '2025-04-12 05:24:48', '2025-04-12 05:24:48'),
(1144, 1, 19, 1, 1, 1, 1, 1, '2025-04-16 06:20:24', '2025-04-16 06:20:24'),
(1145, 2, 19, 1, 1, 0, 1, 1, '2025-04-16 06:20:24', '2025-04-16 06:20:24'),
(1146, 3, 19, 0, 1, 1, 0, 1, '2025-04-16 06:20:24', '2025-04-16 06:20:24'),
(1147, 4, 19, 1, 1, 1, 1, 1, '2025-04-16 06:20:24', '2025-04-16 06:20:24'),
(1148, 5, 19, 1, 1, 0, 1, 1, '2025-04-16 06:20:24', '2025-04-16 06:20:24'),
(1149, 6, 19, 1, 1, 1, 1, 1, '2025-04-16 06:20:24', '2025-04-16 06:20:24'),
(1150, 7, 19, 1, 1, 1, 0, 1, '2025-04-16 06:20:24', '2025-04-16 06:20:24'),
(1151, 8, 19, 1, 1, 0, 1, 1, '2025-04-16 06:20:24', '2025-04-16 06:20:24'),
(1152, 9, 19, 0, 1, 1, 1, 1, '2025-04-16 06:20:24', '2025-04-16 06:20:24'),
(1153, 10, 19, 1, 1, 1, 1, 1, '2025-04-16 06:20:24', '2025-04-16 06:20:24'),
(1154, 11, 19, 1, 1, 1, 1, 1, '2025-04-16 06:20:24', '2025-04-16 06:20:24'),
(1155, 1, 20, 1, 1, 1, 1, 1, '2025-04-16 07:20:49', '2025-04-16 07:20:49'),
(1156, 2, 20, 1, 1, 1, 1, 1, '2025-04-16 07:20:49', '2025-04-16 07:20:49'),
(1157, 3, 20, 1, 1, 1, 1, 1, '2025-04-16 07:20:49', '2025-04-16 07:20:49'),
(1158, 4, 20, 1, 1, 1, 1, 1, '2025-04-16 07:20:49', '2025-04-16 07:20:49'),
(1159, 5, 20, 1, 1, 1, 1, 1, '2025-04-16 07:20:49', '2025-04-16 07:20:49'),
(1160, 6, 20, 1, 1, 1, 1, 1, '2025-04-16 07:20:49', '2025-04-16 07:20:49'),
(1161, 7, 20, 1, 1, 1, 1, 1, '2025-04-16 07:20:49', '2025-04-16 07:20:49'),
(1162, 8, 20, 1, 1, 1, 1, 1, '2025-04-16 07:20:49', '2025-04-16 07:20:49'),
(1163, 9, 20, 1, 1, 1, 1, 1, '2025-04-16 07:20:49', '2025-04-16 07:20:49'),
(1164, 10, 20, 1, 1, 1, 1, 1, '2025-04-16 07:20:49', '2025-04-16 07:20:49'),
(1165, 11, 20, 1, 1, 1, 1, 1, '2025-04-16 07:20:49', '2025-04-16 07:20:49'),
(1166, 1, 24, 1, 1, 1, 1, 1, '2025-04-26 07:48:05', '2025-04-26 07:48:05'),
(1167, 2, 24, 1, 1, 1, 1, 1, '2025-04-26 07:48:05', '2025-04-26 07:48:05'),
(1168, 3, 24, 1, 1, 1, 1, 1, '2025-04-26 07:48:05', '2025-04-26 07:48:05'),
(1169, 4, 24, 1, 1, 1, 1, 1, '2025-04-26 07:48:05', '2025-04-26 07:48:05'),
(1170, 5, 24, 1, 1, 1, 1, 1, '2025-04-26 07:48:05', '2025-04-26 07:48:05'),
(1171, 6, 24, 1, 1, 1, 1, 1, '2025-04-26 07:48:05', '2025-04-26 07:48:05'),
(1172, 7, 24, 1, 1, 1, 1, 1, '2025-04-26 07:48:05', '2025-04-26 07:48:05'),
(1173, 8, 24, 1, 1, 1, 1, 1, '2025-04-26 07:48:05', '2025-04-26 07:48:05'),
(1174, 9, 24, 1, 1, 1, 1, 1, '2025-04-26 07:48:05', '2025-04-26 07:48:05'),
(1175, 10, 24, 1, 1, 1, 1, 1, '2025-04-26 07:48:05', '2025-04-26 07:48:05'),
(1176, 11, 24, 1, 1, 1, 1, 1, '2025-04-26 07:48:05', '2025-04-26 07:48:05'),
(1177, 1, 25, 1, 1, 1, 1, 1, '2025-04-29 06:06:34', '2025-04-29 06:06:34'),
(1178, 2, 25, 1, 1, 1, 1, 1, '2025-04-29 06:06:34', '2025-04-29 06:06:34'),
(1179, 3, 25, 1, 1, 1, 1, 1, '2025-04-29 06:06:34', '2025-04-29 06:06:34'),
(1180, 4, 25, 1, 1, 1, 1, 1, '2025-04-29 06:06:34', '2025-04-29 06:06:34'),
(1181, 5, 25, 1, 1, 1, 1, 1, '2025-04-29 06:06:34', '2025-04-29 06:06:34'),
(1182, 6, 25, 1, 1, 1, 1, 1, '2025-04-29 06:06:34', '2025-04-29 06:06:34'),
(1183, 7, 25, 1, 1, 1, 1, 1, '2025-04-29 06:06:34', '2025-04-29 06:06:34'),
(1184, 8, 25, 1, 1, 1, 1, 1, '2025-04-29 06:06:34', '2025-04-29 06:06:34'),
(1185, 9, 25, 1, 1, 1, 1, 1, '2025-04-29 06:06:34', '2025-04-29 06:06:34'),
(1186, 10, 25, 1, 1, 1, 1, 1, '2025-04-29 06:06:34', '2025-04-29 06:06:34'),
(1187, 11, 25, 1, 1, 1, 1, 1, '2025-04-29 06:06:34', '2025-04-29 06:06:34'),
(1210, 1, 27, 1, 1, 1, 1, 1, '2025-04-29 09:28:20', '2025-04-29 09:28:20'),
(1211, 2, 27, 1, 1, 1, 1, 1, '2025-04-29 09:28:20', '2025-04-29 09:28:20'),
(1212, 3, 27, 1, 1, 1, 1, 1, '2025-04-29 09:28:20', '2025-04-29 09:28:20'),
(1213, 4, 27, 1, 1, 1, 1, 1, '2025-04-29 09:28:20', '2025-04-29 09:28:20'),
(1214, 5, 27, 1, 1, 1, 1, 1, '2025-04-29 09:28:20', '2025-04-29 09:28:20'),
(1215, 6, 27, 1, 1, 1, 1, 1, '2025-04-29 09:28:20', '2025-04-29 09:28:20'),
(1216, 7, 27, 1, 1, 1, 1, 1, '2025-04-29 09:28:20', '2025-04-29 09:28:20'),
(1217, 8, 27, 1, 1, 1, 1, 1, '2025-04-29 09:28:20', '2025-04-29 09:28:20'),
(1218, 9, 27, 1, 1, 1, 1, 1, '2025-04-29 09:28:20', '2025-04-29 09:28:20'),
(1219, 10, 27, 0, 1, 0, 0, 1, '2025-04-29 09:28:20', '2025-04-29 09:28:20'),
(1220, 11, 27, 1, 1, 1, 1, 1, '2025-04-29 09:28:20', '2025-04-29 09:28:20'),
(1243, 1, 29, 1, 1, 1, 1, 1, '2025-04-29 09:35:28', '2025-04-29 09:35:28'),
(1244, 2, 29, 1, 1, 0, 1, 1, '2025-04-29 09:35:28', '2025-04-29 09:35:28'),
(1245, 3, 29, 0, 1, 1, 0, 1, '2025-04-29 09:35:28', '2025-04-29 09:35:28'),
(1246, 4, 29, 0, 1, 1, 1, 1, '2025-04-29 09:35:28', '2025-04-29 09:35:28'),
(1247, 5, 29, 1, 1, 0, 1, 1, '2025-04-29 09:35:28', '2025-04-29 09:35:28'),
(1248, 6, 29, 1, 1, 1, 1, 1, '2025-04-29 09:35:28', '2025-04-29 09:35:28'),
(1249, 7, 29, 0, 1, 0, 1, 1, '2025-04-29 09:35:28', '2025-04-29 09:35:28'),
(1250, 8, 29, 1, 1, 0, 1, 1, '2025-04-29 09:35:28', '2025-04-29 09:35:28'),
(1251, 9, 29, 0, 1, 1, 1, 1, '2025-04-29 09:35:28', '2025-04-29 09:35:28'),
(1252, 10, 29, 0, 1, 0, 0, 1, '2025-04-29 09:35:28', '2025-04-29 09:35:28'),
(1253, 11, 29, 1, 1, 1, 1, 1, '2025-04-29 09:35:28', '2025-04-29 09:35:28'),
(1258, 1, 30, 1, 1, 1, 1, 1, '2025-04-30 12:10:40', '2025-04-30 12:10:40'),
(1259, 2, 30, 0, 1, 1, 1, 1, '2025-04-30 12:10:40', '2025-04-30 12:10:40'),
(1260, 3, 30, 1, 1, 0, 1, 1, '2025-04-30 12:10:40', '2025-04-30 12:10:40'),
(1261, 4, 30, 1, 1, 1, 0, 1, '2025-04-30 12:10:40', '2025-04-30 12:10:40'),
(1262, 5, 30, 1, 1, 1, 0, 1, '2025-04-30 12:10:40', '2025-04-30 12:10:40'),
(1263, 6, 30, 1, 1, 1, 1, 1, '2025-04-30 12:10:40', '2025-04-30 12:10:40'),
(1264, 7, 30, 0, 1, 1, 0, 1, '2025-04-30 12:10:40', '2025-04-30 12:10:40'),
(1265, 8, 30, 1, 1, 1, 1, 1, '2025-04-30 12:10:40', '2025-04-30 12:10:40'),
(1274, 1, 31, 1, 1, 1, 1, 1, '2025-04-30 13:05:43', '2025-04-30 13:05:43'),
(1275, 2, 31, 1, 1, 1, 1, 1, '2025-04-30 13:05:43', '2025-04-30 13:05:43'),
(1276, 3, 31, 1, 1, 1, 1, 1, '2025-04-30 13:05:43', '2025-04-30 13:05:43'),
(1277, 5, 31, 1, 1, 1, 1, 1, '2025-04-30 13:05:43', '2025-04-30 13:05:43'),
(1278, 6, 31, 1, 1, 1, 1, 1, '2025-04-30 13:05:43', '2025-04-30 13:05:43'),
(1279, 4, 31, 1, 1, 1, 1, 1, '2025-04-30 13:05:43', '2025-04-30 13:05:43'),
(1287, 1, 32, 1, 1, 1, 1, 1, '2025-05-02 04:06:29', '2025-05-02 04:06:29'),
(1288, 3, 32, 1, 1, 1, 0, 1, '2025-05-02 04:06:29', '2025-05-02 04:06:29'),
(1289, 4, 32, 1, 1, 1, 0, 1, '2025-05-02 04:06:29', '2025-05-02 04:06:29'),
(1290, 5, 32, 1, 1, 1, 0, 1, '2025-05-02 04:06:29', '2025-05-02 04:06:29'),
(1291, 6, 32, 1, 1, 1, 1, 1, '2025-05-02 04:06:29', '2025-05-02 04:06:29'),
(1292, 7, 32, 1, 1, 1, 0, 1, '2025-05-02 04:06:29', '2025-05-02 04:06:29'),
(1293, 10, 32, 1, 1, 1, 0, 1, '2025-05-02 04:06:29', '2025-05-02 04:06:29'),
(1294, 8, 32, 1, 1, 1, 0, 1, '2025-05-02 04:06:29', '2025-05-02 04:06:29'),
(1295, 1, 34, 1, 1, 1, 1, 1, '2025-05-08 07:47:16', '2025-05-08 07:47:16'),
(1296, 2, 34, 1, 1, 1, 1, 1, '2025-05-08 07:47:16', '2025-05-08 07:47:16'),
(1297, 3, 34, 1, 1, 1, 1, 1, '2025-05-08 07:47:16', '2025-05-08 07:47:16'),
(1298, 4, 34, 1, 1, 1, 1, 1, '2025-05-08 07:47:16', '2025-05-08 07:47:16'),
(1299, 5, 34, 1, 1, 1, 1, 1, '2025-05-08 07:47:16', '2025-05-08 07:47:16'),
(1300, 6, 34, 1, 1, 1, 1, 1, '2025-05-08 07:47:16', '2025-05-08 07:47:16'),
(1301, 7, 34, 1, 1, 1, 1, 1, '2025-05-08 07:47:16', '2025-05-08 07:47:16'),
(1302, 8, 34, 1, 1, 1, 1, 1, '2025-05-08 07:47:16', '2025-05-08 07:47:16'),
(1303, 9, 34, 1, 1, 1, 1, 1, '2025-05-08 07:47:16', '2025-05-08 07:47:16'),
(1304, 10, 34, 1, 1, 1, 1, 1, '2025-05-08 07:47:16', '2025-05-08 07:47:16'),
(1305, 11, 34, 1, 1, 1, 1, 1, '2025-05-08 07:47:16', '2025-05-08 07:47:16'),
(1306, 1, 37, 1, 1, 1, 1, 1, '2025-05-10 08:08:37', '2025-05-10 08:08:37'),
(1307, 2, 37, 1, 1, 1, 1, 1, '2025-05-10 08:08:37', '2025-05-10 08:08:37'),
(1308, 3, 37, 1, 1, 1, 1, 1, '2025-05-10 08:08:37', '2025-05-10 08:08:37'),
(1309, 4, 37, 1, 1, 1, 1, 1, '2025-05-10 08:08:37', '2025-05-10 08:08:37'),
(1310, 5, 37, 1, 1, 1, 1, 1, '2025-05-10 08:08:37', '2025-05-10 08:08:37'),
(1311, 6, 37, 1, 1, 1, 1, 1, '2025-05-10 08:08:37', '2025-05-10 08:08:37'),
(1312, 7, 37, 1, 1, 1, 1, 1, '2025-05-10 08:08:37', '2025-05-10 08:08:37'),
(1313, 8, 37, 1, 1, 1, 1, 1, '2025-05-10 08:08:37', '2025-05-10 08:08:37'),
(1314, 9, 37, 1, 1, 1, 1, 1, '2025-05-10 08:08:37', '2025-05-10 08:08:37'),
(1315, 10, 37, 1, 1, 1, 1, 1, '2025-05-10 08:08:37', '2025-05-10 08:08:37'),
(1316, 11, 37, 1, 1, 1, 1, 1, '2025-05-10 08:08:37', '2025-05-10 08:08:37'),
(1394, 2, 39, 1, 1, 1, 1, 1, '2025-06-10 08:51:32', '2025-06-10 08:51:32'),
(1395, 4, 39, 1, 1, 1, 1, 1, '2025-06-10 08:51:32', '2025-06-10 08:51:32'),
(1396, 6, 39, 1, 1, 1, 1, 1, '2025-06-10 08:51:32', '2025-06-10 08:51:32'),
(1397, 8, 39, 1, 1, 1, 1, 1, '2025-06-10 08:51:32', '2025-06-10 08:51:32'),
(1398, 5, 39, 1, 1, 1, 1, 1, '2025-06-10 08:51:32', '2025-06-10 08:51:32'),
(1399, 3, 38, 0, 1, 0, 1, 1, '2025-06-10 13:59:17', '2025-06-10 13:59:17'),
(1400, 4, 38, 1, 1, 1, 1, 1, '2025-06-10 13:59:17', '2025-06-10 13:59:17'),
(1401, 5, 38, 1, 1, 1, 1, 1, '2025-06-10 13:59:17', '2025-06-10 13:59:17'),
(1402, 6, 38, 1, 1, 1, 1, 1, '2025-06-10 13:59:17', '2025-06-10 13:59:17'),
(1403, 7, 38, 1, 1, 1, 1, 1, '2025-06-10 13:59:17', '2025-06-10 13:59:17'),
(1404, 8, 38, 1, 1, 1, 1, 1, '2025-06-10 13:59:17', '2025-06-10 13:59:17'),
(1405, 9, 38, 1, 1, 1, 1, 1, '2025-06-10 13:59:17', '2025-06-10 13:59:17'),
(1406, 10, 38, 1, 1, 1, 1, 1, '2025-06-10 13:59:17', '2025-06-10 13:59:17'),
(1407, 11, 38, 1, 1, 1, 1, 1, '2025-06-10 13:59:17', '2025-06-10 13:59:17'),
(1408, 1, 38, 1, 1, 1, 1, 1, '2025-06-10 13:59:17', '2025-06-10 13:59:17'),
(1409, 2, 38, 0, 1, 1, 1, 1, '2025-06-10 13:59:17', '2025-06-10 13:59:17'),
(1459, 1, 45, 1, 1, 1, 1, 1, '2026-05-28 06:20:08', '2026-05-28 06:20:08'),
(1460, 2, 45, 1, 1, 1, 1, 1, '2026-05-28 06:20:08', '2026-05-28 06:20:08'),
(1461, 3, 45, 1, 1, 1, 1, 1, '2026-05-28 06:20:08', '2026-05-28 06:20:08'),
(1462, 4, 45, 1, 1, 1, 1, 1, '2026-05-28 06:20:08', '2026-05-28 06:20:08'),
(1463, 5, 45, 1, 1, 1, 1, 1, '2026-05-28 06:20:08', '2026-05-28 06:20:08'),
(1464, 6, 45, 1, 1, 1, 1, 1, '2026-05-28 06:20:08', '2026-05-28 06:20:08'),
(1465, 7, 45, 1, 1, 1, 1, 1, '2026-05-28 06:20:08', '2026-05-28 06:20:08'),
(1466, 8, 45, 1, 1, 1, 1, 1, '2026-05-28 06:20:08', '2026-05-28 06:20:08'),
(1467, 9, 45, 1, 1, 1, 1, 1, '2026-05-28 06:20:08', '2026-05-28 06:20:08'),
(1468, 10, 45, 1, 1, 1, 1, 1, '2026-05-28 06:20:08', '2026-05-28 06:20:08'),
(1469, 11, 45, 1, 1, 1, 1, 1, '2026-05-28 06:20:08', '2026-05-28 06:20:08'),
(1479, 1, 46, 1, 1, 1, 1, 1, '2026-05-31 13:02:52', '2026-05-31 13:02:52'),
(1480, 2, 46, 1, 1, 1, 1, 1, '2026-05-31 13:02:52', '2026-05-31 13:02:52'),
(1481, 3, 46, 1, 1, 1, 1, 1, '2026-05-31 13:02:52', '2026-05-31 13:02:52'),
(1482, 4, 46, 1, 1, 1, 1, 1, '2026-05-31 13:02:52', '2026-05-31 13:02:52'),
(1483, 5, 46, 1, 1, 1, 1, 1, '2026-05-31 13:02:52', '2026-05-31 13:02:52'),
(1484, 6, 46, 1, 1, 1, 1, 1, '2026-05-31 13:02:52', '2026-05-31 13:02:52'),
(1485, 7, 46, 1, 1, 1, 1, 1, '2026-05-31 13:02:52', '2026-05-31 13:02:52'),
(1486, 8, 46, 1, 1, 1, 1, 1, '2026-05-31 13:02:52', '2026-05-31 13:02:52'),
(1487, 10, 46, 1, 1, 1, 1, 1, '2026-05-31 13:02:52', '2026-05-31 13:02:52');

-- --------------------------------------------------------

--
-- Table structure for table `menu_masters`
--

CREATE TABLE `menu_masters` (
  `id` int NOT NULL,
  `name` varchar(255) NOT NULL,
  `url` varchar(255) NOT NULL,
  `short_order` int NOT NULL,
  `parent_id` int NOT NULL,
  `submenu` tinyint(1) NOT NULL,
  `is_menu` tinyint(1) NOT NULL,
  `is_active` tinyint(1) NOT NULL,
  `icon` varchar(255) DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

--
-- Dumping data for table `menu_masters`
--

INSERT INTO `menu_masters` (`id`, `name`, `url`, `short_order`, `parent_id`, `submenu`, `is_menu`, `is_active`, `icon`, `createdAt`, `updatedAt`) VALUES
(1, 'Dashboard', '/dashboard/home', 1, 0, 0, 1, 1, 'AiOutlineHome', '2025-01-25 05:05:05', '2025-01-25 05:05:05'),
(2, 'Staff', '/dashboard/staff', 2, 0, 0, 1, 1, 'FiUserCheck', '2025-01-25 05:05:06', '2025-01-25 05:05:06'),
(3, 'Products', '/dashboard/product', 3, 0, 0, 1, 1, 'MdOutlineProductionQuantityLimits', '2025-01-25 05:05:08', '2025-01-25 05:05:08'),
(4, 'Customers', '/dashboard/customer', 4, 0, 0, 1, 1, 'RiCustomerService2Line', '2025-01-25 05:05:09', '2025-01-25 05:05:09'),
(5, 'Invoices', '/dashboard/invoice', 5, 0, 0, 1, 1, 'TbFileInvoice', '2025-01-25 05:05:10', '2025-01-25 05:05:10'),
(6, 'Reports', '/dashboard/reports', 6, 0, 0, 1, 1, 'FaTasks', '2025-01-25 05:05:12', '2025-01-25 05:05:12'),
(7, 'Payments', '/dashboard/payment', 7, 0, 0, 1, 1, 'Payments', '2025-01-25 05:05:12', '2025-01-25 05:05:12'),
(8, 'Setting', '/dashboard/settings', 8, 0, 0, 1, 1, 'CiSettings', '2025-01-25 05:05:12', '2025-01-25 05:05:12'),
(9, 'Lookup', '/dashboard/settings/lookup', 1, 8, 1, 1, 1, NULL, '2025-01-25 05:05:12', '2025-01-25 05:05:12'),
(10, 'Company Info', '/dashboard/settings/company-info', 2, 8, 1, 1, 1, NULL, '2025-01-25 05:05:12', '2025-01-25 05:05:12'),
(11, 'Smtp Conf', '/dashboard/settings/smtp-conf', 3, 8, 1, 1, 1, NULL, '2025-01-25 05:05:12', '2025-01-25 05:05:12');

-- --------------------------------------------------------

--
-- Table structure for table `payments`
--

CREATE TABLE `payments` (
  `payment_id` int NOT NULL,
  `company_id` int NOT NULL,
  `invoice_id` int NOT NULL,
  `payment_date` datetime NOT NULL,
  `payment_method` varchar(255) DEFAULT NULL,
  `amount_paid` decimal(10,0) DEFAULT NULL,
  `description` varchar(255) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `is_deleted` tinyint(1) NOT NULL DEFAULT '0',
  `created_by` int DEFAULT NULL,
  `modified_by` int DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

--
-- Dumping data for table `payments`
--

INSERT INTO `payments` (`payment_id`, `company_id`, `invoice_id`, `payment_date`, `payment_method`, `amount_paid`, `description`, `is_active`, `is_deleted`, `created_by`, `modified_by`, `createdAt`, `updatedAt`) VALUES
(1, 1, 7, '2025-06-04 00:00:00', 'Online Banking ', 462, 'paid succesfully', 1, 1, NULL, NULL, '2025-06-05 00:34:23', '2025-06-13 02:47:20'),
(6, 1, 7, '2025-06-13 00:00:00', 'Credit Card', 462, '462 paid', 1, 1, NULL, NULL, '2025-06-13 05:49:33', '2025-06-13 05:49:42'),
(7, 1, 7, '2025-06-13 00:00:00', 'Credit Card', 462, '', 1, 1, NULL, NULL, '2025-06-13 05:50:02', '2025-06-13 10:38:50'),
(8, 1, 7, '2025-06-19 00:00:00', 'Credit Card', 462, '', 1, 1, NULL, NULL, '2025-06-13 10:38:17', '2025-06-13 10:38:52'),
(9, 1, 7, '2025-06-14 00:00:00', 'Credit Card', 462, '', 1, 1, NULL, NULL, '2025-06-13 10:39:01', '2025-06-13 12:10:32'),
(12, 1, 8, '2025-06-17 00:00:00', 'Credit Card', 942, '', 1, 1, NULL, NULL, '2025-06-13 12:10:19', '2025-06-13 12:12:35'),
(13, 1, 7, '2025-06-18 00:00:00', 'Credit Card', 462, '', 1, 1, NULL, NULL, '2025-06-13 12:11:23', '2025-06-13 12:12:33'),
(14, 1, 9, '2025-06-27 00:00:00', 'Credit Card', 35482, '', 1, 1, NULL, NULL, '2025-06-13 12:11:40', '2025-06-13 12:12:37'),
(18, 1, 52, '2025-07-03 00:00:00', 'Online Banking ', 374, 'Paid By DDS Perth', 1, 0, NULL, NULL, '2025-07-08 03:19:55', '2025-07-08 03:19:55'),
(19, 1, 18, '2025-07-04 00:00:00', 'Online Banking ', 350, 'Paid By WA Interpreters', 1, 0, NULL, NULL, '2025-07-08 03:20:26', '2025-07-08 03:20:26'),
(20, 1, 16, '2025-07-07 00:00:00', 'Online Banking ', 280, 'Paid By Tambwe', 1, 0, NULL, NULL, '2025-07-08 03:25:21', '2025-07-08 03:25:21'),
(21, 5, 58, '2025-02-10 00:00:00', 'Online Banking ', 560, 'Payment Completed', 1, 0, NULL, NULL, '2025-07-08 03:34:15', '2025-07-08 03:34:15'),
(22, 9, 60, '2025-07-12 00:00:00', 'Credit Card', 28770, '', 1, 1, NULL, NULL, '2025-07-11 09:26:34', '2025-07-14 09:33:47'),
(23, 9, 79, '2025-07-25 00:00:00', 'Credit Card', 4180, '', 1, 1, NULL, NULL, '2025-07-14 09:46:27', '2025-08-02 03:56:04'),
(24, 1, 84, '2025-07-31 00:00:00', 'Online Banking ', 880, 'Payment Done', 1, 0, NULL, NULL, '2025-08-02 03:55:53', '2025-08-02 03:55:53'),
(25, 5, 90, '2025-08-27 00:00:00', 'Online Banking ', 3000, 'paid on 27 August 2025', 1, 0, NULL, NULL, '2025-08-28 04:38:40', '2025-08-28 04:38:40'),
(26, 1, 95, '2025-09-05 00:00:00', 'Online Banking ', 275, 'Month of August', 1, 0, NULL, NULL, '2025-09-07 01:53:03', '2025-09-07 01:53:03'),
(27, 1, 100, '2025-10-17 00:00:00', 'Online Banking ', 374, 'Late payment', 1, 0, NULL, NULL, '2025-10-18 11:24:36', '2025-10-18 11:24:36'),
(28, 5, 98, '2025-10-01 00:00:00', 'Online Banking ', 250000, 'Completed ', 1, 0, NULL, NULL, '2025-10-18 11:29:17', '2025-10-18 11:29:17'),
(29, 1, 102, '2025-11-13 00:00:00', 'Online Banking ', 275, 'Paid in NAB', 1, 0, NULL, NULL, '2025-11-16 12:12:46', '2025-11-16 12:12:46'),
(30, 1, 105, '2026-01-01 00:00:00', 'Online Banking ', 275, '', 1, 0, NULL, NULL, '2026-01-02 02:55:41', '2026-01-02 02:55:41'),
(31, 5, 111, '2026-01-08 00:00:00', 'Online Banking ', 560, 'Jan 2026-27', 1, 0, NULL, NULL, '2026-01-11 03:20:30', '2026-01-11 03:20:30'),
(32, 5, 116, '2026-01-14 00:00:00', 'Online Banking ', 900, '', 1, 0, NULL, NULL, '2026-01-16 03:40:36', '2026-01-16 03:40:36'),
(33, 5, 113, '2026-01-19 00:00:00', 'Online Banking ', 1920, '', 1, 0, NULL, NULL, '2026-01-19 06:28:17', '2026-01-19 06:28:17'),
(34, 1, 110, '2026-01-23 00:00:00', 'Online Banking ', 710, '', 1, 0, NULL, NULL, '2026-01-23 04:41:47', '2026-01-23 04:41:47'),
(35, 1, 117, '2026-02-08 00:00:00', 'Online Banking ', 1380, '', 1, 0, NULL, NULL, '2026-02-09 02:58:22', '2026-02-09 02:58:22'),
(36, 5, 97, '2025-10-01 00:00:00', 'Online Banking ', 250000, 'paid', 1, 0, NULL, NULL, '2026-04-15 10:19:33', '2026-04-15 10:19:33'),
(37, 1, 120, '2026-05-06 00:00:00', 'Online Banking ', 160, 'NAB', 1, 0, NULL, NULL, '2026-05-11 01:27:29', '2026-05-11 01:27:29'),
(38, 1, 121, '2026-05-06 00:00:00', 'Online Banking ', 560, 'NAB', 1, 0, NULL, NULL, '2026-05-11 01:28:24', '2026-05-11 01:28:24'),
(39, 1, 124, '2026-05-23 00:00:00', 'Online Banking ', 50000, 'paid on 23rd May to CIMB LLP acc', 1, 0, NULL, NULL, '2026-05-24 03:35:04', '2026-05-24 03:35:04'),
(40, 13, 125, '2026-05-27 00:00:00', 'Online Banking ', 1980, 'for arpro and Oshtrainers', 1, 0, NULL, NULL, '2026-05-28 01:16:15', '2026-05-28 01:16:15');

-- --------------------------------------------------------

--
-- Table structure for table `products`
--

CREATE TABLE `products` (
  `product_id` int NOT NULL,
  `company_id` int NOT NULL,
  `Name` varchar(255) NOT NULL,
  `description` varchar(255) NOT NULL,
  `unit_price` varchar(255) DEFAULT NULL,
  `quantity` varchar(255) DEFAULT NULL,
  `category` varchar(255) NOT NULL,
  `status` tinyint(1) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `is_deleted` tinyint(1) NOT NULL DEFAULT '0',
  `created_by` int DEFAULT NULL,
  `modified_by` int DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `measurement_type` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

--
-- Dumping data for table `products`
--

INSERT INTO `products` (`product_id`, `company_id`, `Name`, `description`, `unit_price`, `quantity`, `category`, `status`, `is_active`, `is_deleted`, `created_by`, `modified_by`, `createdAt`, `updatedAt`, `measurement_type`) VALUES
(1, 1, 'RJ 45 LAN Cables', 'Cat 6E LAN Cable. New Gen Electromagnetic free cable', '55.35', '', 'RJ45 Lan Cables', 1, 1, 0, NULL, NULL, '2025-05-20 07:10:26', '2025-06-02 01:03:39', '60 Metres'),
(2, 1, 'HX 55', 'HX55 Fiber Port Connector', '110', '', 'Fiber Port Connector', 0, 1, 0, NULL, NULL, '2025-05-20 07:12:06', '2025-05-20 12:56:19', 'nil'),
(4, 1, 'Maxia Group Web Hosting Renewal ', 'Maxia Group Web Hosting Renewal ', '280', '', 'Web Hosting Renewal', 0, 1, 0, NULL, NULL, '2025-06-15 04:13:53', '2025-06-15 04:18:29', ''),
(5, 1, 'WA Interpreters Change Request', 'Fixed the error on the salary slip generator. We disable the button till an interpreter name is added. Changed the interpreter field to mandatory', '350', '', 'Services', 0, 1, 0, NULL, NULL, '2025-06-18 02:13:01', '2025-06-18 02:13:01', ''),
(6, 1, 'Standard Web Maintenance & SMO', 'Standard Web Maintenance & SMO', '275.00', '', 'Services', 0, 1, 0, NULL, NULL, '2025-07-01 02:25:29', '2025-07-01 02:25:29', ''),
(7, 1, 'Webhosting July 2025 - Sept 2025', 'Quarterly Web Hosting', '99.00', '', 'Services', 0, 1, 0, NULL, NULL, '2025-07-01 02:26:36', '2025-07-01 02:26:36', ''),
(8, 9, 'Mouse pad', 'A mouse pad (or mouse mat) is a flat surface designed to enhance the usability and precision of a computer mouse. It provides a consistent texture for the mouse sensor to track movement accurately and', '500', '', 'Product 1', 1, 0, 0, NULL, NULL, '2025-07-11 09:12:51', '2025-12-01 04:22:51', ''),
(9, 9, 'Sofa ', '', '800', '', 'Product 1', 0, 0, 0, NULL, NULL, '2025-07-11 09:14:31', '2025-12-01 04:22:51', ''),
(10, 5, 'HOSTING WITH 15 EMAILS', '', '320', '', 'Web Hosting Renewal', 0, 1, 0, NULL, NULL, '2026-01-02 03:02:41', '2026-01-02 03:02:41', ''),
(11, 5, 'DOMAIN METADMS.COM, NEXT RENEWAL 30 JAN 2026', '', '120', '', 'Web Hosting Renewal', 0, 1, 0, NULL, NULL, '2026-01-02 03:03:47', '2026-01-02 03:03:47', ''),
(12, 5, 'GYM System Software and Maintenance Annually', '', '170.00', '', 'Product 1', 1, 1, 0, NULL, NULL, '2026-01-02 04:16:01', '2026-01-02 04:22:55', ''),
(13, 14, 'Hosting Renewal Rexharbour', 'Web Hosting Yearly Renewal', '320', '', 'Web Hosting Renewal', 0, 1, 0, NULL, NULL, '2026-05-28 04:37:11', '2026-05-28 04:37:11', '');

-- --------------------------------------------------------

--
-- Table structure for table `smtpConfs`
--

CREATE TABLE `smtpConfs` (
  `smtp_id` int NOT NULL,
  `company_id` int NOT NULL,
  `host_name` varchar(255) NOT NULL,
  `port` varchar(255) NOT NULL,
  `auth_user` varchar(255) DEFAULT NULL,
  `auth_pass` varchar(255) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `is_deleted` tinyint(1) NOT NULL DEFAULT '0',
  `created_by` int DEFAULT NULL,
  `modified_by` int DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

--
-- Dumping data for table `smtpConfs`
--

INSERT INTO `smtpConfs` (`smtp_id`, `company_id`, `host_name`, `port`, `auth_user`, `auth_pass`, `is_active`, `is_deleted`, `created_by`, `modified_by`, `createdAt`, `updatedAt`) VALUES
(1, 5, '11ss', '', '11digital@11squaresolutions.com', 'Ruban12345678@@//', 1, 0, 0, 0, '2025-06-14 01:23:29', '2025-06-14 01:23:29');

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `user_id` int NOT NULL,
  `company_id` text NOT NULL,
  `full_Name` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password` varchar(255) DEFAULT NULL,
  `mobile` varchar(255) DEFAULT NULL,
  `role_id` int NOT NULL,
  `last_login` datetime DEFAULT NULL,
  `resetPasswordToken` varchar(255) DEFAULT NULL,
  `resetPasswordExpires` datetime DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `is_deleted` tinyint(1) NOT NULL DEFAULT '0',
  `created_by` int DEFAULT NULL,
  `modified_by` int DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `profilePath` varchar(255) DEFAULT NULL,
  `resetPasswordOtp` int NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`user_id`, `company_id`, `full_Name`, `email`, `password`, `mobile`, `role_id`, `last_login`, `resetPasswordToken`, `resetPasswordExpires`, `is_active`, `is_deleted`, `created_by`, `modified_by`, `createdAt`, `updatedAt`, `profilePath`, `resetPasswordOtp`) VALUES
(1, '0', 'superadmin', 'superadmin', '6bb5cd50b88f14ea8e60beba9756fc448965b8c8a49e9b73f02b5588549a7779', '8569998812', 0, '0000-00-00 00:00:00', '', '0000-00-00 00:00:00', 1, 0, NULL, NULL, '0000-00-00 00:00:00', '2025-10-04 12:49:35', '', 0),
(38, '1,13', 'Ruban', 'ruban@11squaresolutions.com', 'ef797c8118f02dfb649607dd5d3f8c7623048c9c063d532cc95c5ed7a898a64f', '123', 1, '0000-00-00 00:00:00', '', '0000-00-00 00:00:00', 1, 0, 0, 0, '2025-05-20 12:33:16', '2026-05-28 05:57:40', '', 283726),
(45, '1', 'admin', 'force11s@yahoo.com', 'ef797c8118f02dfb649607dd5d3f8c7623048c9c063d532cc95c5ed7a898a64f', '12345678', 0, '0000-00-00 00:00:00', '', '0000-00-00 00:00:00', 1, 0, NULL, NULL, '2025-10-23 05:38:54', '2026-05-28 06:20:08', '', 0),
(46, '14', 'Navinn', 'navinn@11squaresolutions.com', '776d911fd12420bcf90f17e985fd36cc41d326f777f953d2013638131ee17534', '012', 2, NULL, NULL, NULL, 1, 0, NULL, NULL, '2026-05-28 01:30:49', '2026-05-31 13:02:52', NULL, 0);

--
-- Indexes for dumped tables
--

--
-- Indexes for table `bank_information`
--
ALTER TABLE `bank_information`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `categories`
--
ALTER TABLE `categories`
  ADD PRIMARY KEY (`category_id`);

--
-- Indexes for table `companyInfos`
--
ALTER TABLE `companyInfos`
  ADD PRIMARY KEY (`company_id`);

--
-- Indexes for table `customers`
--
ALTER TABLE `customers`
  ADD PRIMARY KEY (`customer_id`);

--
-- Indexes for table `invoiceHistories`
--
ALTER TABLE `invoiceHistories`
  ADD PRIMARY KEY (`history_id`);

--
-- Indexes for table `invoices`
--
ALTER TABLE `invoices`
  ADD PRIMARY KEY (`invoice_id`);

--
-- Indexes for table `invoice_items`
--
ALTER TABLE `invoice_items`
  ADD PRIMARY KEY (`item_id`);

--
-- Indexes for table `lookups`
--
ALTER TABLE `lookups`
  ADD PRIMARY KEY (`lookup_id`);

--
-- Indexes for table `menu_lists`
--
ALTER TABLE `menu_lists`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `menu_masters`
--
ALTER TABLE `menu_masters`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `payments`
--
ALTER TABLE `payments`
  ADD PRIMARY KEY (`payment_id`);

--
-- Indexes for table `products`
--
ALTER TABLE `products`
  ADD PRIMARY KEY (`product_id`);

--
-- Indexes for table `smtpConfs`
--
ALTER TABLE `smtpConfs`
  ADD PRIMARY KEY (`smtp_id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`user_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `bank_information`
--
ALTER TABLE `bank_information`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=13;

--
-- AUTO_INCREMENT for table `categories`
--
ALTER TABLE `categories`
  MODIFY `category_id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `companyInfos`
--
ALTER TABLE `companyInfos`
  MODIFY `company_id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=15;

--
-- AUTO_INCREMENT for table `customers`
--
ALTER TABLE `customers`
  MODIFY `customer_id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=31;

--
-- AUTO_INCREMENT for table `invoiceHistories`
--
ALTER TABLE `invoiceHistories`
  MODIFY `history_id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `invoices`
--
ALTER TABLE `invoices`
  MODIFY `invoice_id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=126;

--
-- AUTO_INCREMENT for table `invoice_items`
--
ALTER TABLE `invoice_items`
  MODIFY `item_id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=1827;

--
-- AUTO_INCREMENT for table `lookups`
--
ALTER TABLE `lookups`
  MODIFY `lookup_id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=19;

--
-- AUTO_INCREMENT for table `menu_lists`
--
ALTER TABLE `menu_lists`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=1488;

--
-- AUTO_INCREMENT for table `menu_masters`
--
ALTER TABLE `menu_masters`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=13;

--
-- AUTO_INCREMENT for table `payments`
--
ALTER TABLE `payments`
  MODIFY `payment_id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=41;

--
-- AUTO_INCREMENT for table `products`
--
ALTER TABLE `products`
  MODIFY `product_id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=14;

--
-- AUTO_INCREMENT for table `smtpConfs`
--
ALTER TABLE `smtpConfs`
  MODIFY `smtp_id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `user_id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=47;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
