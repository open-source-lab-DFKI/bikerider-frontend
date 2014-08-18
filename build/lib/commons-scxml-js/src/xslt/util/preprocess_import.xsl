<?xml version="1.0"?>
<!--
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
-->
<!--
This stylesheet takes as input another xsl stylesheet, and
recursively copies in the contents of its imported stylesheets,
being careful to respect the semantics of import (does not overwrite
elements that are already defined). 
-->
<xsl:stylesheet 
	xmlns:xsl="http://www.w3.org/1999/XSL/Transform" 
	version="1.0">
	<xsl:output method="xml"/>

	<!-- identity transform -->
	<xsl:template match="@*|node()">
	   <xsl:copy>
	      <xsl:apply-templates select="@*|node()"/>
	   </xsl:copy>
	</xsl:template>

	<xsl:template match="xsl:import">
		<xsl:param name="elementsAlreadyDefined" select="/xsl:stylesheet/*"/>

		<xsl:variable name="newDocument" select="document(@href)"/>
		<xsl:variable name="newTopLevelElements" select="$newDocument/xsl:stylesheet/*" />

		<!-- merge -->
		<!-- there may be a more general way to do this -->
		<!-- filter templates -->
		<xsl:variable name="filteredNewTemplates" 
			select="$newTopLevelElements[self::xsl:template]
							[not(@name = $elementsAlreadyDefined[self::xsl:template]/@name)]
							[not(@match = $elementsAlreadyDefined[self::xsl:template]/@match)]" />


		<!-- params -->
		<xsl:variable name="filteredNewParams" 
			select="$newTopLevelElements[self::xsl:param]
						[not( @name = $elementsAlreadyDefined[self::xsl:param]/@name )]"/>

		
		<!-- output -->
		<xsl:variable name="filteredNewOutput" 
			select="$newTopLevelElements[self::xsl:output]
						[not( $elementsAlreadyDefined[self::xsl:output] )]"/>

		<!-- variable -->
		<xsl:variable name="filteredNewVariables" 
			select="$newTopLevelElements[self::xsl:variable]
						[not( @name = $elementsAlreadyDefined[self::xsl:variable]/@name )]"/>

		<!-- filteredNewTopLevelElements -->
		<xsl:variable name="filteredNewTopLevelElements" select="$filteredNewTemplates | $filteredNewParams | $filteredNewOutput | $filteredNewVariables"/>

		<!-- combine old and new top-level elements -->
		<xsl:variable name="combinedElementsAlreadyDefined" select="$filteredNewTopLevelElements | $elementsAlreadyDefined"/>

		<!-- recursive import -->
		<xsl:apply-templates select="$newTopLevelElements[self::xsl:import]">
			<xsl:with-param name="elementsAlreadyDefined" select="$combinedElementsAlreadyDefined"/>
		</xsl:apply-templates>

		<!-- copy all other nodes -->
		<xsl:apply-templates select="$filteredNewTopLevelElements"/>

	</xsl:template>

</xsl:stylesheet>
